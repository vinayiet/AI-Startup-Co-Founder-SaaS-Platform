from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import User, Subscription, SubscriptionPlan
from app.repositories.user import UserRepository, SubscriptionPlanRepository
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.exceptions import AuthenticationException, ValidationException


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.plan_repo = SubscriptionPlanRepository(db)

    async def register_user(self, user_in: Dict[str, Any]) -> User:
        # Check if email is already taken
        existing_user = await self.user_repo.get_by_email(user_in["email"])
        if existing_user:
            raise ValidationException("Email already registered.")

        # Hash password
        password_hash = await get_password_hash(user_in["password"])
        
        # Create user dict
        user_data = {
            "email": user_in["email"],
            "password_hash": password_hash,
            "full_name": user_in["full_name"],
            "role": user_in.get("role", "member"),
            "is_active": True
        }
        
        user = await self.user_repo.create(user_data)
        
        # Get or create default Free Plan
        free_plan = await self.plan_repo.get_by_name("Free")
        if not free_plan:
            # Seed free plan
            plan_data = {
                "name": "Free",
                "max_workspaces": 1,
                "max_projects": 3,
                "max_agent_runs_per_month": 5,
                "api_access": False
            }
            free_plan = await self.plan_repo.create(plan_data)
        
        # Bind Free Subscription
        subscription_data = {
            "user_id": user.id,
            "plan_id": free_plan.id,
            "status": "active",
            "current_period_end": datetime.utcnow() + timedelta(days=30),
            "stripe_subscription_id": None
        }
        
        # We write straight to session via subscription create
        subscription = Subscription(**subscription_data)
        self.db.add(subscription)
        await self.db.flush()
        
        return user

    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise AuthenticationException("Invalid email or password.")
        
        if not await verify_password(password, user.password_hash):
            raise AuthenticationException("Invalid email or password.")
            
        if not user.is_active:
            raise AuthenticationException("User account is disabled.")

        # Create JWT access token
        access_token = create_access_token(subject=user.id)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "plan": user.subscription.plan.name if user.subscription else "Free"
            }
        }

    async def authenticate_token(self, token: str) -> User:
        from app.core.security import decode_token
        user_id = decode_token(token)
        if not user_id:
            raise AuthenticationException("Invalid session or expired token.")
        
        user = await self.user_repo.get_user_with_relations(user_id)
        if not user:
            raise AuthenticationException("User no longer exists.")
            
        if not user.is_active:
            raise AuthenticationException("User account is disabled.")
            
        return user
