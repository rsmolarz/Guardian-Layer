"""
GuardianLayer — Main Application Entry Point
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
from starlette.requests import Request
import time

from config import settings
from database import create_db_and_tables, get_session
from routers import (
    auth_router, apps_router, deploy_router,
    backup_router, agents_router, alerts_router, webhook_router,
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("guardianLayer")

# ─── Prometheus Metrics ────────────────────────────────────────────────────────
REQUEST_COUNT = Counter(
    "guardianLayer_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "guardianLayer_request_latency_seconds",
    "HTTP request latency",
    ["endpoint"],
)


# ─── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GuardianLayer starting up...")
    create_db_and_tables()
    _seed_admin_token()
    from scheduler import start_scheduler
    start_scheduler()
    logger.info("GuardianLayer ready. Docs: /docs")
    yield
    from scheduler import stop_scheduler
    stop_scheduler()
    logger.info("GuardianLayer shut down.")


def _seed_admin_token():
    """On first run, create an admin token if none exist."""
    from sqlmodel import Session, select
    from models import APIToken
    from auth import create_api_token
    with Session(__import__("database").engine) as session:
        existing = session.exec(select(APIToken)).first()
        if not existing:
            raw = create_api_token("bootstrap-admin", "admin", session)
            logger.warning(
                "\n\n"
                "╔══════════════════════════════════════════════════════╗\n"
                "║          GUARDIANAYER BOOTSTRAP ADMIN TOKEN           ║\n"
                "╠══════════════════════════════════════════════════════╣\n"
                "║  Store this token — it will NOT be shown again!      ║\n"
                "╠══════════════════════════════════════════════════════╣\n"
                "║  Token: %-44s ║\n"
                "╚══════════════════════════════════════════════════════╝\n",
                raw,
            )


# ─── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GuardianLayer",
    description="Centralized control plane for app lifecycle management",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Metrics Middleware ────────────────────────────────────────────────────────

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    latency = time.time() - start
    endpoint = request.url.path
    REQUEST_COUNT.labels(request.method, endpoint, response.status_code).inc()
    REQUEST_LATENCY.labels(endpoint).observe(latency)
    return response


# ─── Routes ───────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth_router,    prefix=API_PREFIX)
app.include_router(apps_router,    prefix=API_PREFIX)
app.include_router(deploy_router,  prefix=API_PREFIX)
app.include_router(backup_router,  prefix=API_PREFIX)
app.include_router(agents_router,  prefix=API_PREFIX)
app.include_router(alerts_router,  prefix=API_PREFIX)
app.include_router(webhook_router, prefix=API_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "GuardianLayer",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health():
    from queue_manager import redis_conn
    redis_ok = False
    if redis_conn:
        try:
            redis_conn.ping()
            redis_ok = True
        except Exception:
            pass
    return {
        "status": "healthy",
        "redis": "connected" if redis_ok else "unavailable",
        "database": "connected",
    }


@app.get("/metrics", tags=["Observability"], include_in_schema=False)
def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
