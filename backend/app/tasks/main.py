import asyncio
import json
import logging
from celery.utils.log import get_task_logger
from app.tasks.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.repositories.report import WorkflowRunRepository, ReportRepository
from app.repositories.project import ProjectRepository
from app.db.base import Report
from app.agents.graph import compiled_graph

logger = get_task_logger(__name__)


def run_async(coro):
    # Runs async coroutines inside Celery's synchronous task worker thread
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="run_agent_workflow_task")
def run_agent_workflow_task(run_id_str: str):
    logger.info(f"Starting analysis run task for run_id: {run_id_str}")
    run_async(_execute_workflow(run_id_str, resume=False))


@celery_app.task(name="resume_agent_workflow_task")
def resume_agent_workflow_task(run_id_str: str):
    logger.info(f"Resuming analysis run task for run_id: {run_id_str}")
    run_async(_execute_workflow(run_id_str, resume=True))


async def _execute_workflow(run_id_str: str, resume: bool = False):
    async with AsyncSessionLocal() as db:
        run_repo = WorkflowRunRepository(db)
        project_repo = ProjectRepository(db)
        report_repo = ReportRepository(db)
        
        run = await run_repo.get(run_id_str)
        if not run:
            logger.error(f"Workflow run not found: {run_id_str}")
            return

        project = await project_repo.get(run.project_id)
        if not project:
            logger.error(f"Project not found for run: {run_id_str}")
            run.status = "failed"
            await db.commit()
            return

        run.status = "running"
        await db.commit()

        config = {"configurable": {"thread_id": run_id_str}}

        try:
            if not resume:
                # Initialize state
                initial_state = {
                    "project_id": str(project.id),
                    "run_id": run_id_str,
                    "idea": project.description,
                    "industry": project.industry,
                    "target_audience": project.target_audience,
                    "current_step": "Idea Analyzer",
                    "human_feedbacks": [],
                    "category": "",
                    "target_users": "",
                    "business_model": "",
                    "assumptions": "",
                    "market_demand": "",
                    "tam": "",
                    "sam": "",
                    "som": "",
                    "market_trends": "",
                    "competitors": [],
                    "positioning": "",
                    "opportunities": "",
                    "tech_stack": "",
                    "architecture": "",
                    "infra_costs": "",
                    "mvp_features": [],
                    "priority_backlog": [],
                    "roadmap": [],
                    "revenue_model": "",
                    "projections": {},
                    "break_even": "",
                    "launch_strategy": "",
                    "acquisition_channels": [],
                    "growth_hacks": [],
                    "risks": [],
                    "mitigations": [],
                    "pitch_deck": [],
                    "report": {},
                    "eval_validation": {},
                    "confidence_score": 0.0,
                    "hallucinations": []
                }
                # Start fresh graph execution
                # We wrap the async call with await inside run_async
                await compiled_graph.ainvoke(initial_state, config=config)
            else:
                # Resume graph execution (None tells LangGraph to continue from checkpoint)
                # Ensure the checkpointer memory has the updated states
                if run.state_snapshot:
                    await compiled_graph.aupdate_state(config, run.state_snapshot)
                await compiled_graph.ainvoke(None, config=config)

            # Retrieve state after node interrupt/completion
            state = await compiled_graph.aget_state(config)
            
            # Re-fetch run to avoid stale session checks
            run = await run_repo.get(run_id_str)
            
            if state.next:
                # The workflow has been interrupted by a checkpoint pause (HITL)
                next_step = state.next[0]
                run.status = "waiting_approval"
                run.current_step = next_step
                run.state_snapshot = dict(state.values)
                
                # Append steps log
                logs = dict(run.logs or {"steps": []})
                logs["steps"].append(f"Paused before {next_step} for human approval checkpoint.")
                run.logs = logs
                logger.info(f"Workflow run {run_id_str} paused for approval before step: {next_step}")
            else:
                # Completed successfully
                run.status = "completed"
                run.current_step = "Done"
                run.state_snapshot = dict(state.values)
                
                logs = dict(run.logs or {"steps": []})
                logs["steps"].append("Analysis completed. Generating final report.")
                run.logs = logs

                # Save final compiled Report to DB
                report_data = state.values.get("report", {})
                if report_data:
                    new_report = Report(
                        project_id=project.id,
                        title=f"Investor Validation Report - {project.name}",
                        sections=report_data.get("compiled_sections", report_data),
                        version="1.0.0"
                    )
                    db.add(new_report)
                    await db.flush()
                    
                    # Ingest report to Qdrant vector database for Copilot
                    from app.services.copilot_service import CopilotService
                    copilot_service = CopilotService(db)
                    await copilot_service.ingest_report_to_qdrant(new_report)
                
                logger.info(f"Workflow run {run_id_str} finished and report successfully saved.")

            await db.commit()

        except Exception as e:
            logger.exception(f"Exception raised in workflow run {run_id_str}: {e}")
            run = await run_repo.get(run_id_str)
            run.status = "failed"
            logs = dict(run.logs or {"steps": []})
            logs["steps"].append(f"Execution failed: {str(e)}")
            run.logs = logs
            await db.commit()
