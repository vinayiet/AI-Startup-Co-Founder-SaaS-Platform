import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.db.base import ChatSession, ChatMessage, CopilotAnalytics


class ChatSessionRepository(BaseRepository[ChatSession]):
    def __init__(self, db):
        super().__init__(ChatSession, db)

    async def get_by_project(self, project_id: str) -> List[ChatSession]:
        query = select(self.model).where(self.model.project_id == project_id).order_by(self.model.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_session_with_project(self, session_id: str) -> Optional[ChatSession]:
        query = select(self.model).where(self.model.id == session_id).options(selectinload(self.model.project))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


class ChatMessageRepository(BaseRepository[ChatMessage]):
    def __init__(self, db):
        super().__init__(ChatMessage, db)

    async def get_by_session(self, session_id: str) -> List[ChatMessage]:
        query = select(self.model).where(self.model.session_id == session_id).order_by(self.model.created_at.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())


class CopilotAnalyticsRepository(BaseRepository[CopilotAnalytics]):
    def __init__(self, db):
        super().__init__(CopilotAnalytics, db)
