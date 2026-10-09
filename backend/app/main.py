import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import CORS_ORIGINS, HEALTH_CHECKER_ENABLED, SEED_ON_STARTUP
from .core.db import Base, SessionLocal, add_missing_columns, engine
from .core.errors import AppError, app_error_handler
from .modules import registry
from .modules.activity.routes import router as activity_router
from .modules.auth.routes import router as auth_router
from .modules.cli.routes import router as cli_router
from .modules.dashboard.routes import router as dashboard_router
from .modules.feedback.routes import router as feedback_router
from .modules.healthchecks.checker import run_checker
from .modules.healthchecks.routes import router as healthchecks_router
from .modules.records.routes import router as records_router
from .modules.records.routes import test_router as records_test_router
from .modules.search.routes import router as search_router
from .modules.zones.routes import router as zones_router
from .seed import seed

logger = logging.getLogger("route53")

ROUTERS = (
    auth_router,
    zones_router,
    records_router,
    records_test_router,
    healthchecks_router,
    activity_router,
    dashboard_router,
    search_router,
    feedback_router,
    cli_router,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    if added := add_missing_columns(engine):
        logger.info("Added database columns: %s", ", ".join(added))
    if SEED_ON_STARTUP:
        with SessionLocal() as db:
            seed(db)
    stop = asyncio.Event()
    checker = asyncio.create_task(run_checker(SessionLocal, stop)) if HEALTH_CHECKER_ENABLED else None
    yield
    stop.set()
    if checker:
        with suppress(asyncio.CancelledError):
            await checker


app = FastAPI(
    title="Route 53 Clone API",
    version="2.0.0",
    description="Backend for the AWS Route 53 console clone: accounts, hosted zones, DNS records, "
    "health checks, CloudShell CLI.",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_exception_handler(AppError, app_error_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in ROUTERS:
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
