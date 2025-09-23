import logging
from logging.handlers import RotatingFileHandler
from typing import Any, Dict

import structlog
from structlog import contextvars

from .config import Settings


def setup_logging(settings: Settings) -> None:
    """Configure stdlib logging and structlog for the application."""

    logging.basicConfig(level=settings.log_level)

    logfile_path = settings.pipeline_log_path
    logfile_path.parent.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(logfile_path, maxBytes=2 * 1024 * 1024, backupCount=5)
    file_handler.setLevel(settings.log_level)
    file_handler.setFormatter(logging.Formatter("%(message)s"))

    logging.getLogger().addHandler(file_handler)

    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            _merge_context_fields,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def _merge_context_fields(logger: Any, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    pipeline_context = contextvars.get_contextvars().copy()
    pipeline_context.update(event_dict)
    return pipeline_context
