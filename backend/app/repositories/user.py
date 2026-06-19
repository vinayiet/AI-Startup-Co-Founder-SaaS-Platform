from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import User, SubscriptionPlan, Subscription
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        query = (
            select(User)
            .where(User.email == email)
            .options(selectinload(User.subscription).selectinload(Subscription.plan))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_with_relations(self, user_id: str) -> Optional[User]:
        query = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.subscription).selectinload(Subscription.plan),
                selectinload(User.workspaces)
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    def __init__(self, db: AsyncSession):
        super().__init__(SubscriptionPlan, db)

    async def get_by_name(self, name: str) -> Optional[SubscriptionPlan]:
        query = select(SubscriptionPlan).where(SubscriptionPlan.name == name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
