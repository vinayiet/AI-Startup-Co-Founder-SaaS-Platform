from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Workspace
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self, db: AsyncSession):
        super().__init__(Workspace, db)

    async def get_by_owner(self, owner_id: str, *, skip: int = 0, limit: int = 100) -> List[Workspace]:
        query = select(Workspace).where(Workspace.owner_id == owner_id).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())
