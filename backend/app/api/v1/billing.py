from typing import Dict, Any
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.db.base import User
from app.services.stripe_service import StripeService

router = APIRouter()


@router.post("/checkout")
async def checkout(
    plan_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stripe_service = StripeService(db)
    session_info = await stripe_service.create_checkout_session(current_user.id, plan_name)
    return session_info


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.json()
    stripe_service = StripeService(db)
    await stripe_service.process_stripe_webhook(payload)
    return {"status": "success"}
