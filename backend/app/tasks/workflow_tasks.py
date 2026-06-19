import asyncio
import logging
import json
import redis
from uuid import UUID
from celery import shared_task
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.main import celery_app
from app.db.session import AsyncSessionLocal
from app.db.base import WorkflowRun, Report, Project
from app.repositories.report import WorkflowRunRepository, ReportRepository
from app.repositories.project import ProjectRepository
from app.agents.graph import workflow
from app.core.config import settings

logger = logging.getLogger(__name__)


def _publish_status(run_id: str, status: str, step: str):
    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.publish(f"run:{run_id}", json.dumps({"status": status, "current_step": step}))
    except Exception as e:
        logger.error(f"Failed to publish status update: {e}")



async def _run_workflow_async(run_id: str):
    async with AsyncSessionLocal() as db:
        run_repo = WorkflowRunRepository(db)
        project_repo = ProjectRepository(db)
        report_repo = ReportRepository(db)

        run = await run_repo.get(run_id)
        if not run:
            logger.error(f"Workflow run {run_id} not found.")
            return

        project = await project_repo.get_project_with_workspace(run.project_id)
        
        # Prepare state
        state = {
            "project_id": str(project.id),
            "run_id": str(run.id),
            "user_input": project.description,
            "industry": project.industry or "General Tech",
            "target_audience": project.target_audience or "General Public",
            "errors": [],
            "logs": ["Workflow started."],
            "approved": None,
            "feedback": ""
        }

        # If there's an existing state snapshot, restore it (useful for resumes)
        if run.state_snapshot:
            state.update(run.state_snapshot)

        run.status = "running"
        await db.commit()
        
        # Publish start event
        _publish_status(run_id, "running", "Idea Analyzer")

        try:
            # Run LangGraph
            final_state = await workflow.ainvoke(state)
            
            # Save state snapshot
            run.state_snapshot = final_state
            run.current_step = final_state.get("current_step", "Completed")
            
            # Determine next step based on graph completion
            if final_state.get("current_step") == "Completed":
                run.status = "completed"
                # Compile report sections
                sections = {
                    "idea_analysis": final_state.get("idea_analysis"),
                    "market_research": final_state.get("market_research"),
                    "competitor_intelligence": final_state.get("competitor_intelligence"),
                    "reality_check": final_state.get("reality_validator_report"),
                    "technical_architecture": final_state.get("technical_architecture"),
                    "mvp_roadmap": final_state.get("mvp_roadmap"),
                    "financial_projections": final_state.get("financial_projections"),
                    "marketing_strategy": final_state.get("marketing_strategy"),
                    "risk_analysis": final_state.get("risk_analysis"),
                    "pitch_deck": final_state.get("pitch_deck"),
                    "moderator_report": final_state.get("moderator_report"),
                    "evaluation_report": final_state.get("evaluation_report")
                }
                 # Save final report
                report = Report(
                    project_id=project.id,
                    title=f"Co-Founder Analysis for {project.name}",
                    sections=sections,
                    version="1.0.0"
                )
                db.add(report)
                await db.flush()

                # Ingest report to Qdrant vector database for Copilot
                from app.services.copilot_service import CopilotService
                copilot_service = CopilotService(db)
                await copilot_service.ingest_report_to_qdrant(report)

                logger.info(f"Report successfully generated for project {project.id}")
            elif final_state.get("current_step") == "Evaluator":
                # Stopped at moderator node, waiting for approval
                run.status = "waiting_approval"
            else:
                run.status = "failed"
                
            await db.commit()
            _publish_status(run_id, run.status, run.current_step)

        except Exception as e:
            logger.exception(f"Error during workflow execution: {e}")
            run.status = "failed"
            run.logs = {"errors": [str(e)]}
            await db.commit()
            _publish_status(run_id, "failed", "Error")


async def _resume_workflow_async(run_id: str, approved: bool, feedback: str):
    async with AsyncSessionLocal() as db:
        run_repo = WorkflowRunRepository(db)
        run = await run_repo.get(run_id)
        if not run:
            logger.error(f"Workflow run {run_id} not found for resume.")
            return

        # Restore state, apply approval and feedback
        state = run.state_snapshot or {}
        state["approved"] = approved
        state["feedback"] = feedback or ""
        
        if not approved:
            # If rejected, reset flow step to beginning
            state["current_step"] = "Idea Analyzer"

        run.state_snapshot = state
        run.status = "running"
        await db.commit()

    # Re-run the main workflow async runner to pick up where we left off
    await _run_workflow_async(run_id)


@celery_app.task(name="app.tasks.workflow_tasks.run_workflow_task")
def run_workflow_task(run_id: str):
    logger.info(f"Starting Celery task for run_id: {run_id}")
    asyncio.run(_run_workflow_async(run_id))


@celery_app.task(name="app.tasks.workflow_tasks.resume_workflow_task")
def resume_workflow_task(run_id: str, approved: bool, feedback: str):
    logger.info(f"Resuming Celery task for run_id: {run_id}")
    asyncio.run(_resume_workflow_async(run_id, approved, feedback))
