import uuid
from datetime import datetime
from typing import Dict, Any
from pydantic import BaseModel


class ReportBase(BaseModel):
    title: str
    sections: Dict[str, Any]
    version: str


class ReportResponse(ReportBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
