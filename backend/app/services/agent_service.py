import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import WorkflowRun, Project
from app.repositories.report import WorkflowRunRepository, ReportRepository
from app.repositories.project import ProjectRepository
from app.core.exceptions import NotFoundException, AuthorizationException, ValidationException
# We import celery_app dynamically to prevent circular dependencies
from celery import Celery


class AgentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.run_repo = WorkflowRunRepository(db)
        self.project_repo = ProjectRepository(db)
        self.report_repo = ReportRepository(db)

    async def get_run(self, run_id: str, user_id: str) -> WorkflowRun:
        run = await self.run_repo.get(run_id)
        if not run:
            raise NotFoundException("Workflow run not found")
        
        # Verify ownership
        project = await self.project_repo.get_project_with_workspace(run.project_id)
        if not project or str(project.workspace.owner_id) != str(user_id):
            raise AuthorizationException("Not authorized to access this workflow run")
        return run

    async def start_analysis(self, project_id: str, user_id: str) -> WorkflowRun:
        # Check project ownership
        project = await self.project_repo.get_project_with_workspace(project_id)
        if not project:
            raise NotFoundException("Project not found")
        if str(project.workspace.owner_id) != str(user_id):
            raise AuthorizationException("Not authorized to analyze this project")

        # Check for active run
        active_run = await self.run_repo.get_active_run(project_id)
        if active_run:
            raise ValidationException(
                f"An analysis is already in progress (Status: {active_run.status}). Please wait."
            )

        # Create new workflow run
        run_data = {
            "project_id": project.id,
            "status": "pending",
            "current_step": "Idea Analyzer",
            "state_snapshot": {},
            "logs": {"events": ["Analysis scheduled."]}
        }
        run = await self.run_repo.create(run_data)
        await self.db.commit()

        # Enqueue background task via Celery
        celery_app = Celery(broker="redis://localhost:6379/0")
        celery_app.send_task("app.tasks.workflow_tasks.run_workflow_task", args=[str(run.id)])

        return run

    async def approve_step(self, run_id: str, user_id: str, approved: bool, feedback: Optional[str] = None) -> WorkflowRun:
        run = await self.get_run(run_id, user_id)
        if run.status != "waiting_approval":
            raise ValidationException(
                f"Cannot approve. Run is currently in '{run.status}' state."
            )

        # Update status and log approval
        run.status = "running"
        events = run.logs.get("events", [])
        action = "Approved" if approved else "Rejected (Feedback provided)"
        events.append(f"User Action: {action}. Feedback: {feedback or 'None'}")
        run.logs = {"events": events}
        
        await self.db.flush()
        await self.db.commit()

        # Enqueue resume task
        celery_app = Celery(broker="redis://localhost:6379/0")
        celery_app.send_task(
            "app.tasks.workflow_tasks.resume_workflow_task",
            args=[str(run.id), approved, feedback]
        )

        return run
