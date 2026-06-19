from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, db: AsyncSession):
        super().__init__(Project, db)

    async def get_by_workspace(self, workspace_id: str, *, skip: int = 0, limit: int = 100) -> List[Project]:
        query = select(Project).where(Project.workspace_id == workspace_id).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_project_with_workspace(self, project_id: str) -> Optional[Project]:
        query = (
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.workspace))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
