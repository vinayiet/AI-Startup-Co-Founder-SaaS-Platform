from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.db.session import AsyncSessionLocal
from app.db.base import SubscriptionPlan
from app.repositories.user import SubscriptionPlanRepository

# Import Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.projects import router as projects_router
from app.api.v1.reports import router as reports_router
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.billing import router as billing_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.board import router as board_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging
    setup_logging()
    
    # Auto-generate DB tables
    from app.db.base import Base
    from app.db.session import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Database seeding on startup
    async with AsyncSessionLocal() as db:
        try:
            plan_repo = SubscriptionPlanRepository(db)
            # Seed Free Plan
            free_plan = await plan_repo.get_by_name("Free")
            if not free_plan:
                await plan_repo.create({
                    "name": "Free",
                    "max_workspaces": 1,
                    "max_projects": 3,
                    "max_agent_runs_per_month": 5,
                    "api_access": False
                })
            # Seed Pro Plan
            pro_plan = await plan_repo.get_by_name("Pro")
            if not pro_plan:
                await plan_repo.create({
                    "name": "Pro",
                    "max_workspaces": 5,
                    "max_projects": 15,
                    "max_agent_runs_per_month": 50,
                    "api_access": True
                })
            # Seed Enterprise Plan
            enterprise_plan = await plan_repo.get_by_name("Enterprise")
            if not enterprise_plan:
                await plan_repo.create({
                    "name": "Enterprise",
                    "max_workspaces": 20,
                    "max_projects": 100,
                    "max_agent_runs_per_month": 500,
                    "api_access": True
                })
            await db.commit()
        except Exception as e:
            await db.rollback()
            import logging
            logging.getLogger("app.main").error(f"Startup DB Seeding failed: {e}")
            
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production configure origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
register_exception_handlers(app)

# Include API Routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(workspaces_router, prefix="/api/v1/workspaces", tags=["Workspaces"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(api_keys_router, prefix="/api/v1/api-keys", tags=["API Keys"])
app.include_router(billing_router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(copilot_router, prefix="/api/v1/copilot", tags=["AI Copilot"])
app.include_router(board_router, prefix="/api/v1/board", tags=["AI Board of Directors"])


# Prometheus metrics endpoint
@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.ENV}
