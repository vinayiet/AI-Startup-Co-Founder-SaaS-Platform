from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Workspace, User
from app.repositories.workspace import WorkspaceRepository
from app.repositories.user import UserRepository
from app.core.exceptions import NotFoundException, ResourceLimitException, AuthorizationException


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.workspace_repo = WorkspaceRepository(db)
        self.user_repo = UserRepository(db)

    async def get_user_workspaces(self, user_id: str) -> List[Workspace]:
        return await self.workspace_repo.get_by_owner(user_id)

    async def get_workspace(self, workspace_id: str, user_id: str) -> Workspace:
        workspace = await self.workspace_repo.get(workspace_id)
        if not workspace:
            raise NotFoundException("Workspace not found")
        if str(workspace.owner_id) != str(user_id):
            raise AuthorizationException("Not authorized to access this workspace")
        return workspace

    async def create_workspace(self, name: str, user_id: str) -> Workspace:
        user = await self.user_repo.get_user_with_relations(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Verify limits
        max_workspaces = 1
        if user.subscription and user.subscription.plan:
            max_workspaces = user.subscription.plan.max_workspaces
            
        current_workspaces = await self.workspace_repo.get_by_owner(user_id)
        if len(current_workspaces) >= max_workspaces:
            raise ResourceLimitException(
                f"Your plan '{user.subscription.plan.name if user.subscription else 'Free'}' "
                f"only allows up to {max_workspaces} workspace(s)."
            )

        workspace_data = {
            "name": name,
            "owner_id": user.id
        }
        return await self.workspace_repo.create(workspace_data)

    async def update_workspace(self, workspace_id: str, name: str, user_id: str) -> Workspace:
        workspace = await self.get_workspace(workspace_id, user_id)
        return await self.workspace_repo.update(workspace, {"name": name})

    async def delete_workspace(self, workspace_id: str, user_id: str) -> Workspace:
        workspace = await self.get_workspace(workspace_id, user_id)
        return await self.workspace_repo.remove(workspace.id)
