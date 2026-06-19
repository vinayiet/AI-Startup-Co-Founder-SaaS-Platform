import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Report
from app.repositories.report import ReportRepository
from app.repositories.project import ProjectRepository
from app.core.exceptions import NotFoundException


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.report_repo = ReportRepository(db)
        self.project_repo = ProjectRepository(db)

    async def get_reports(self, user_id: uuid.UUID, project_id: uuid.UUID) -> List[Report]:
        # Validate project ownership
        project = await self.project_repo.get_project_with_workspace(project_id)
        if not project or project.workspace.owner_id != user_id:
            raise NotFoundException("Project not found or unauthorized.")
        return await self.report_repo.get_by_project(str(project_id))

    async def get_report(self, user_id: uuid.UUID, report_id: uuid.UUID) -> Report:
        report = await self.report_repo.get(report_id)
        if not report:
            raise NotFoundException("Report not found.")
        
        # Validate project ownership
        project = await self.project_repo.get_project_with_workspace(report.project_id)
        if not project or project.workspace.owner_id != user_id:
            raise NotFoundException("Report not found or unauthorized.")
            
        return report
