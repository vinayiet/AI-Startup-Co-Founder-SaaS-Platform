from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import APIKey
from app.repositories.base import BaseRepository


class APIKeyRepository(BaseRepository[APIKey]):
    def __init__(self, db: AsyncSession):
        super().__init__(APIKey, db)

    async def get_by_hash(self, key_hash: str) -> Optional[APIKey]:
        query = select(APIKey).where(APIKey.key_hash == key_hash, APIKey.is_active == True)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str) -> List[APIKey]:
        query = select(APIKey).where(APIKey.user_id == user_id).order_by(APIKey.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())
