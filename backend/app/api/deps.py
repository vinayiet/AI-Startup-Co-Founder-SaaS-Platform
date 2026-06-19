import hashlib
from typing import AsyncGenerator, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.db.base import User
from app.repositories.user import UserRepository
from app.repositories.api_key import APIKeyRepository
from app.core.security import decode_token
from app.core.exceptions import AuthenticationException, AuthorizationException

# OAuth2 scheme
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="api/v1/auth/login"
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    user_id = decode_token(token)
    if not user_id:
        raise AuthenticationException("Could not validate credentials")
    
    user_repo = UserRepository(db)
    user = await user_repo.get_user_with_relations(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise AuthenticationException("Inactive user")
        
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise AuthenticationException("Inactive user")
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise AuthorizationException("The user does not have enough privileges")
    return current_user


async def get_user_from_api_key(
    db: AsyncSession = Depends(get_db),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> User:
    if not x_api_key:
        raise AuthenticationException("API Key missing")
        
    # Check key format
    if not x_api_key.startswith("sk_cofounder_"):
        raise AuthenticationException("Invalid API Key format")

    # Hash the key to find it in the DB
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    api_key_repo = APIKeyRepository(db)
    api_key_record = await api_key_repo.get_by_hash(key_hash)
    
    if not api_key_record:
        raise AuthenticationException("Invalid or revoked API Key")
        
    user_repo = UserRepository(db)
    user = await user_repo.get_user_with_relations(str(api_key_record.user_id))
    if not user or not user.is_active:
        raise AuthenticationException("User is deactivated")
        
    return user
