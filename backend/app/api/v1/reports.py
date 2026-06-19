import json
import asyncio
import redis.asyncio as aioredis
from typing import List
from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect
from app.api.dependencies import get_agent_service, get_current_user
from app.api.schemas.report import ReportOut, WorkflowRunOut, ApprovalRequest
from app.services.agent_service import AgentService
from app.db.base import User
from app.core.config import settings

router = APIRouter()


@router.websocket("/workflow-runs/{run_id}/stream")
async def stream_workflow_run(websocket: WebSocket, run_id: str):
    await websocket.accept()
    
    # Connect to redis async pubsub
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"run:{run_id}")
    
    try:
        while True:
            # Non-blocking get message
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = json.loads(message["data"])
                await websocket.send_json(data)
                if data.get("status") in ["completed", "failed"]:
                    break
            # Small delay to yield loop
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"run:{run_id}")
        await pubsub.close()
        await r.close()


@router.get("/workflow-runs/{run_id}", response_model=WorkflowRunOut)
async def get_workflow_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    return await agent_service.get_run(run_id, current_user.id)


@router.post("/workflow-runs/{run_id}/approve", response_model=WorkflowRunOut)
async def approve_workflow_step(
    run_id: str,
    approval: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    return await agent_service.approve_step(
        run_id=run_id,
        user_id=current_user.id,
        approved=approval.approved,
        feedback=approval.feedback
    )


@router.get("/project/{project_id}", response_model=List[ReportOut])
@router.get("/projects/{project_id}/reports", response_model=List[ReportOut])
async def list_project_reports(
    project_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    project = await agent_service.project_repo.get_project_with_workspace(project_id)
    if not project or str(project.workspace.owner_id) != str(current_user.id):
        from app.core.exceptions import AuthorizationException
        raise AuthorizationException("Not authorized to access reports for this project")
    return await agent_service.report_repo.get_by_project(project_id)


@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    report = await agent_service.report_repo.get(report_id)
    if not report:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Report not found")
        
    project = await agent_service.project_repo.get_project_with_workspace(report.project_id)
    if not project or str(project.workspace.owner_id) != str(current_user.id):
        from app.core.exceptions import AuthorizationException
        raise AuthorizationException("Not authorized to view this report")
        
    return report
