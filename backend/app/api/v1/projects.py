import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.db.base import User
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    WorkflowRunResponse,
    WorkflowRunApprove
)
from app.services.project_service import ProjectService

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    projects = await project_service.get_projects(current_user.id, workspace_id)
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    project = await project_service.create_project(
        user_id=current_user.id,
        workspace_id=project_in.workspace_id,
        project_data=project_in.model_dump()
    )
    return project


@router.get("/{id}", response_model=ProjectResponse)
async def get_project(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    project = await project_service.get_project(current_user.id, id)
    return project


@router.post("/{id}/analyze", response_model=WorkflowRunResponse)
async def trigger_analysis(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    run = await project_service.trigger_analysis(current_user.id, id)
    return run


@router.get("/{id}/runs", response_model=List[WorkflowRunResponse])
async def list_runs(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    runs = await project_service.get_runs(current_user.id, id)
    return runs


@router.get("/runs/{run_id}", response_model=WorkflowRunResponse)
async def get_run(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    run = await project_service.get_run(current_user.id, run_id)
    return run


@router.post("/runs/{run_id}/approve")
async def approve_run(
    run_id: uuid.UUID,
    approval_in: WorkflowRunApprove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    response = await project_service.approve_checkpoint(
        user_id=current_user.id,
        run_id=run_id,
        approval_data=approval_in.model_dump()
    )
    return response

@router.post("/runs/{run_id}/retry")
async def retry_run(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    response = await project_service.retry_run(
        user_id=current_user.id,
        run_id=run_id
    )
    return response
