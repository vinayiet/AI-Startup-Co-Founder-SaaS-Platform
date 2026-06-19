from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class ReportOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    sections: Dict[str, Any]
    version: str
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunOut(BaseModel):
    id: UUID
    project_id: UUID
    status: str
    current_step: str
    state_snapshot: Dict[str, Any]
    logs: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApprovalRequest(BaseModel):
    approved: bool
    feedback: Optional[str] = None
