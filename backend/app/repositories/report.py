from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Report, WorkflowRun
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    def __init__(self, db: AsyncSession):
        super().__init__(Report, db)

    async def get_by_project(self, project_id: str) -> List[Report]:
        query = select(Report).where(Report.project_id == project_id).order_by(desc(Report.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_latest_for_project(self, project_id: str) -> Optional[Report]:
        query = select(Report).where(Report.project_id == project_id).order_by(desc(Report.created_at)).limit(1)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


class WorkflowRunRepository(BaseRepository[WorkflowRun]):
    def __init__(self, db: AsyncSession):
        super().__init__(WorkflowRun, db)

    async def get_by_project(self, project_id: str) -> List[WorkflowRun]:
        query = select(WorkflowRun).where(WorkflowRun.project_id == project_id).order_by(desc(WorkflowRun.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_active_run(self, project_id: str) -> Optional[WorkflowRun]:
        query = (
            select(WorkflowRun)
            .where(
                WorkflowRun.project_id == project_id,
                WorkflowRun.status.in_(["pending", "running", "waiting_approval"])
            )
            .order_by(desc(WorkflowRun.created_at))
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
