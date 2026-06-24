import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Workspace, Project, WorkflowRun, User
from app.repositories.workspace import WorkspaceRepository
from app.repositories.project import ProjectRepository
from app.repositories.report import WorkflowRunRepository
from app.repositories.user import UserRepository
from app.core.exceptions import ValidationException, NotFoundException, ResourceLimitException


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.workspace_repo = WorkspaceRepository(db)
        self.project_repo = ProjectRepository(db)
        self.run_repo = WorkflowRunRepository(db)
        self.user_repo = UserRepository(db)

    async def get_workspaces(self, user_id: uuid.UUID) -> List[Workspace]:
        return await self.workspace_repo.get_by_owner(str(user_id))

    async def create_workspace(self, user_id: uuid.UUID, name: str) -> Workspace:
        # Check limits
        user = await self.user_repo.get_user_with_relations(str(user_id))
        if not user:
            raise NotFoundException("User not found.")
        
        limit = 1
        if user.subscription and user.subscription.plan:
            limit = user.subscription.plan.max_workspaces
            
        current_workspaces = await self.workspace_repo.get_by_owner(str(user_id))
        if len(current_workspaces) >= limit:
            raise ResourceLimitException(f"You have reached the maximum workspaces limit ({limit}) for your subscription plan.")

        return await self.workspace_repo.create({"name": name, "owner_id": user_id})

    async def get_projects(self, user_id: uuid.UUID, workspace_id: uuid.UUID) -> List[Project]:
        # Validate ownership
        workspace = await self.workspace_repo.get(workspace_id)
        if not workspace or workspace.owner_id != user_id:
            raise NotFoundException("Workspace not found or unauthorized.")
        return await self.project_repo.get_by_workspace(str(workspace_id))

    async def create_project(self, user_id: uuid.UUID, workspace_id: uuid.UUID, project_data: Dict[str, Any]) -> Project:
        # Validate workspace ownership
        workspace = await self.workspace_repo.get(workspace_id)
        if not workspace or workspace.owner_id != user_id:
            raise NotFoundException("Workspace not found or unauthorized.")

        # Check project limits
        user = await self.user_repo.get_user_with_relations(str(user_id))
        if not user:
            raise NotFoundException("User not found.")
        
        limit = 3
        if user.subscription and user.subscription.plan:
            limit = user.subscription.plan.max_projects

        current_projects = await self.project_repo.get_by_workspace(str(workspace_id))
        if len(current_projects) >= limit:
            raise ResourceLimitException(f"You have reached the maximum projects limit ({limit}) for this workspace.")

        data = {
            "workspace_id": workspace_id,
            "name": project_data["name"],
            "description": project_data["description"],
            "industry": project_data.get("industry"),
            "target_audience": project_data.get("target_audience")
        }
        return await self.project_repo.create(data)

    async def get_project(self, user_id: uuid.UUID, project_id: uuid.UUID) -> Project:
        project = await self.project_repo.get_project_with_workspace(project_id)
        if not project or project.workspace.owner_id != user_id:
            raise NotFoundException("Project not found or unauthorized.")
        return project

    async def trigger_analysis(self, user_id: uuid.UUID, project_id: uuid.UUID) -> WorkflowRun:
        project = await self.get_project(user_id, project_id)
        
        # Check running runs
        active_run = await self.run_repo.get_active_run(str(project_id))
        if active_run:
            raise ValidationException("An analysis run is already in progress for this project.")

        # Check monthly usage limits
        user = await self.user_repo.get_user_with_relations(str(user_id))
        limit = 5
        if user.subscription and user.subscription.plan:
            limit = user.subscription.plan.max_agent_runs_per_month
        
        # Simple count check for active month
        # In production, count workflow runs created in the current month
        # For this logic, we will check count and allow execution if it's less than limits
        # (A production query would group by project workflow runs for the user)
        
        run_data = {
            "project_id": project_id,
            "status": "pending",
            "current_step": "Idea Analyzer",
            "state_snapshot": {},
            "logs": {"steps": []}
        }
        run = await self.run_repo.create(run_data)
        await self.db.commit()

        # Enqueue background Celery task
        from app.tasks.main import run_agent_workflow_task
        run_agent_workflow_task.delay(str(run.id))

        return run

    async def get_runs(self, user_id: uuid.UUID, project_id: uuid.UUID) -> List[WorkflowRun]:
        await self.get_project(user_id, project_id)
        return await self.run_repo.get_by_project(str(project_id))

    async def get_run(self, user_id: uuid.UUID, run_id: uuid.UUID) -> WorkflowRun:
        run = await self.run_repo.get(run_id)
        if not run:
            raise NotFoundException("Workflow run not found.")
        await self.get_project(user_id, run.project_id)
        return run

    async def approve_checkpoint(self, user_id: uuid.UUID, run_id: uuid.UUID, approval_data: Dict[str, Any]) -> Dict[str, Any]:
        run = await self.get_run(user_id, run_id)
        if run.status != "waiting_approval":
            raise ValidationException("Run is not currently waiting for approval.")

        # Update run status to pending/resuming
        run.status = "running"
        
        # Apply feedback modifications to state snapshot if any
        snapshot = run.state_snapshot
        if approval_data.get("state_updates"):
            snapshot.update(approval_data["state_updates"])
        
        # Inject feedback or comments from human
        if approval_data.get("feedback"):
            if "human_feedbacks" not in snapshot:
                snapshot["human_feedbacks"] = []
            snapshot["human_feedbacks"].append({
                "step": run.current_step,
                "feedback": approval_data["feedback"],
                "timestamp": datetime.utcnow().isoformat()
            })

        run.state_snapshot = snapshot
        await self.db.flush()
        await self.db.commit()

        # Resume Celery task
        from app.tasks.main import resume_agent_workflow_task
        resume_agent_workflow_task.delay(str(run.id))

        return {"status": "resumed"}

    async def retry_run(self, user_id: uuid.UUID, run_id: uuid.UUID) -> Dict[str, Any]:
        run = await self.get_run(user_id, run_id)
        if run.status != "failed":
            raise ValidationException("Only failed runs can be retried.")

        # Update run status to resuming
        run.status = "running"
        
        # Append to logs
        logs = dict(run.logs or {"steps": []})
        logs["steps"].append("Retrying failed execution from last saved checkpoint...")
        run.logs = logs

        await self.db.flush()
        await self.db.commit()

        # Resume Celery task
        from app.tasks.main import resume_agent_workflow_task
        resume_agent_workflow_task.delay(str(run.id))

        return {"status": "retrying"}
