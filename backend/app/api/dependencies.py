from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.base import User
from app.services.auth_service import AuthService
from app.services.workspace_service import WorkspaceService
from app.services.project_service import ProjectService
from app.services.agent_service import AgentService

# Endpoint where OAuth2 flow password form login will post credentials
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


def get_workspace_service(db: AsyncSession = Depends(get_db)) -> WorkspaceService:
    return WorkspaceService(db)


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(db)


def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(db)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    try:
        user = await auth_service.authenticate_token(token)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this user role."
            )
        return user
