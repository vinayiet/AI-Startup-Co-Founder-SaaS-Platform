import uuid
from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel


class APIKeyCreate(BaseModel):
    name: str
    scopes: Optional[Dict[str, List[str]]] = None
    expires_in_days: Optional[int] = None


class APIKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    scopes: Dict[str, List[str]]
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyNew(APIKeyResponse):
    key: str  # Plaintext key returned only once upon creation
