import uuid
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.db.base import User, APIKey
from app.repositories.api_key import APIKeyRepository
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyNew

router = APIRouter()


@router.get("", response_model=List[APIKeyResponse])
async def list_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key_repo = APIKeyRepository(db)
    keys = await api_key_repo.get_by_user(str(current_user.id))
    return keys


@router.post("", response_model=APIKeyNew, status_code=status.HTTP_201_CREATED)
async def create_key(
    key_in: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check subscription permissions
    if not current_user.subscription or not current_user.subscription.plan.api_access:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="API access requires a Pro or Enterprise plan."
        )

    # Generate key components
    raw_token = secrets.token_urlsafe(32)
    api_key = f"sk_cofounder_{raw_token}"
    prefix = api_key[:16]
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    expires_at = None
    if key_in.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_in.expires_in_days)

    api_key_repo = APIKeyRepository(db)
    db_key = await api_key_repo.create({
        "user_id": current_user.id,
        "name": key_in.name,
        "key_hash": key_hash,
        "prefix": prefix,
        "scopes": key_in.scopes or {"scopes": ["read", "write"]},
        "is_active": True,
        "expires_at": expires_at
    })

    # Return key schema containing plaintext key (ONLY once)
    return APIKeyNew(
        id=db_key.id,
        name=db_key.name,
        prefix=db_key.prefix,
        scopes=db_key.scopes,
        is_active=db_key.is_active,
        expires_at=db_key.expires_at,
        created_at=db_key.created_at,
        key=api_key
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key_repo = APIKeyRepository(db)
    db_key = await api_key_repo.get(id)
    
    if not db_key or db_key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="API Key not found or unauthorized")
        
    db_key.is_active = False
    await db.flush()
