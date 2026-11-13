"""
Project Jarvis — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.middleware.trace_middleware import TraceAndAuditMiddleware
from app.models.base import Base
from app.services.auth_service import ensure_owner_user_exists

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and default owner on application startup."""
    logger.info("Initializing Jarvis backend", environment=settings.ENVIRONMENT)
    if settings.ENVIRONMENT != "testing":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with async_session_factory() as session:
            await ensure_owner_user_exists(session)
    logger.info("Jarvis backend initialized successfully")
    yield
    logger.info("Shutting down Jarvis backend")
    if settings.ENVIRONMENT != "testing":
        await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0-m1",
    description="Control Plane API for Project Jarvis",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Middleware - allows localhost, Vercel deployments, and temporary domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.tmp\.now|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-Id", "X-Response-Time-Ms"],
)

# Trace & Action Audit Middleware (logs every click, status, duration, crash)
app.add_middleware(TraceAndAuditMiddleware)

# Include v1 master router at canonical /api/v1 and root fallback for resilient client compatibility
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(api_v1_router, prefix="")


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": "0.1.0-m1", "status": "online"}
