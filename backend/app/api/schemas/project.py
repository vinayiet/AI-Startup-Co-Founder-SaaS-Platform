from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10)  # The startup idea
    industry: Optional[str] = None
    target_audience: Optional[str] = None


class ProjectOut(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str
    industry: Optional[str]
    target_audience: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
