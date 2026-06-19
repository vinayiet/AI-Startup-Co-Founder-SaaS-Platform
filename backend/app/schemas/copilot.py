import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    citations: Optional[List[Dict[str, Any]]] = None
    suggestions: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CopilotAnalyticsResponse(BaseModel):
    total_chats: int
    questions_asked: int
    slash_commands_used: int


class DashboardMetricsResponse(BaseModel):
    startup_score: float
    competitor_count: int
    risk_score: float
    financial_summary: Dict[str, Any]
