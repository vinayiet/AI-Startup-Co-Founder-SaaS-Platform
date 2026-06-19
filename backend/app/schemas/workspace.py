import uuid
from datetime import datetime
from pydantic import BaseModel


class WorkspaceBase(BaseModel):
    name: str


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(WorkspaceBase):
    pass


class WorkspaceResponse(WorkspaceBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
