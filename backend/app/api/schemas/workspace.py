from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
