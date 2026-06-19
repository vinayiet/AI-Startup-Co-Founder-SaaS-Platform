from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings

import anyio

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return await anyio.to_thread.run_sync(
            bcrypt.checkpw,
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


async def get_password_hash(password: str) -> str:
    hashed = await anyio.to_thread.run_sync(
        bcrypt.hashpw,
        password.encode('utf-8'),
        bcrypt.gensalt()
    )
    return hashed.decode('utf-8')


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[str]:
    try:
        decoded_token = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return decoded_token["sub"]
    except JWTError:
        return None
