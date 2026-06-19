import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    description: str
    industry: Optional[str] = None
    target_audience: Optional[str] = None


class ProjectCreate(ProjectBase):
    workspace_id: uuid.UUID


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    current_step: str
    state_snapshot: Dict[str, Any]
    logs: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunApprove(BaseModel):
    feedback: Optional[str] = None
    state_updates: Optional[Dict[str, Any]] = None
