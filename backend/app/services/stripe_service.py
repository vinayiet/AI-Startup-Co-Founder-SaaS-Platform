import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Subscription, SubscriptionPlan, User
from app.repositories.user import UserRepository, SubscriptionPlanRepository


class StripeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.plan_repo = SubscriptionPlanRepository(db)

    async def create_checkout_session(self, user_id: uuid.UUID, plan_name: str) -> Dict[str, Any]:
        # Mock stripe checkout session creation
        plan = await self.plan_repo.get_by_name(plan_name)
        if not plan:
            # Seed if missing
            if plan_name == "Pro":
                plan = await self.plan_repo.create({
                    "name": "Pro",
                    "max_workspaces": 5,
                    "max_projects": 15,
                    "max_agent_runs_per_month": 50,
                    "api_access": True
                })
            elif plan_name == "Enterprise":
                plan = await self.plan_repo.create({
                    "name": "Enterprise",
                    "max_workspaces": 20,
                    "max_projects": 100,
                    "max_agent_runs_per_month": 500,
                    "api_access": True
                })
        
        # Returns a mock checkout URL
        return {
            "checkout_url": f"https://billing.cofounder.ai/mock-checkout?user_id={user_id}&plan={plan_name}",
            "session_id": f"cs_mock_{uuid.uuid4().hex}"
        }

    async def process_stripe_webhook(self, payload: Dict[str, Any]) -> None:
        # Processes simulated stripe webhook callbacks
        event_type = payload.get("type")
        if event_type == "checkout.session.completed":
            data = payload.get("data", {})
            user_id_str = data.get("client_reference_id")
            plan_name = data.get("metadata", {}).get("plan_name", "Pro")
            stripe_sub_id = data.get("subscription")

            if user_id_str:
                user_id = uuid.UUID(user_id_str)
                user = await self.user_repo.get_user_with_relations(str(user_id))
                plan = await self.plan_repo.get_by_name(plan_name)
                
                if user and plan:
                    # Update or create subscription
                    if user.subscription:
                        user.subscription.plan_id = plan.id
                        user.subscription.status = "active"
                        user.subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
                        user.subscription.stripe_subscription_id = stripe_sub_id
                    else:
                        sub = Subscription(
                            user_id=user_id,
                            plan_id=plan.id,
                            status="active",
                            current_period_end=datetime.utcnow() + timedelta(days=30),
                            stripe_subscription_id=stripe_sub_id
                        )
                        self.db.add(sub)
                    await self.db.flush()
