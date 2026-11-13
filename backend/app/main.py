"""
Project Jarvis — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.models.base import Base
from app.services.auth_service import ensure_owner_user_exists

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and default owner on application startup."""
    logger.info("Initializing Jarvis backend", environment=settings.ENVIRONMENT)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        await ensure_owner_user_exists(session)
    logger.info("Jarvis backend initialized successfully")
    yield
    logger.info("Shutting down Jarvis backend")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0-m1",
    description="Control Plane API for Project Jarvis",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 master router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0-m1",
        "status": "online"
    }

