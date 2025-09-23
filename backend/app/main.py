from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from structlog import get_logger

from .api.routes import router
from .api.deps import setup_background_tasks
from .core.config import get_settings
from .core.logging import setup_logging

_logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings)
    setup_background_tasks(settings)
    _logger.info("application_startup", environment=settings.environment)
    yield
    _logger.info("application_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Improved Notion Meeting Notes", version="0.1.0", lifespan=lifespan)
    app.include_router(router)
    return app


app = create_app()
