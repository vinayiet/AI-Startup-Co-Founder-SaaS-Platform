from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.db.base import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse
from app.services.project_service import ProjectService

router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    workspaces = await project_service.get_workspaces(current_user.id)
    return workspaces


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    workspace = await project_service.create_workspace(
        user_id=current_user.id,
        name=workspace_in.name
    )
    return workspace
