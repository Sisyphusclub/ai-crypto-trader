from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import settings
from app.core.startup import verify_startup_secrets
from app.core.logging import setup_logging
from app.api.health import router as health_router
from app.api.exchanges import router as exchanges_router
from app.api.models import router as models_router
from app.api.tasks import router as tasks_router
from app.api.trade import router as trade_router
from app.api.strategies import router as strategies_router
from app.api.signals import router as signals_router
from app.api.traders import router as traders_router
from app.api.logs import router as logs_router
from app.api.stream import router as stream_router
from app.api.pnl import router as pnl_router
from app.api.replay import router as replay_router
from app.api.alerts import router as alerts_router
from app.api.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    setup_logging()
    verify_startup_secrets()
    yield


app = FastAPI(
    title="AI Crypto Trader API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(exchanges_router, prefix="/api/v1")
app.include_router(models_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(trade_router, prefix="/api/v1")
app.include_router(strategies_router, prefix="/api/v1")
app.include_router(signals_router, prefix="/api/v1")
app.include_router(traders_router, prefix="/api/v1")
app.include_router(logs_router, prefix="/api/v1")
app.include_router(stream_router, prefix="/api/v1")
app.include_router(pnl_router, prefix="/api/v1")
app.include_router(replay_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
