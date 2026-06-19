import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "filename": record.filename,
            "line": record.lineno,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        # Include custom log attributes
        if hasattr(record, "extra_attrs"):
            log_data.update(record.extra_attrs)
        return json.dumps(log_data)


def setup_logging() -> None:
    root_logger = logging.getLogger()
    
    # Set default level
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    root_logger.setLevel(log_level)

    # Clean existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    
    if settings.ENV == "production":
        console_handler.setFormatter(JSONFormatter())
    else:
        # Development readable formatting
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d) - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(formatter)
        
    root_logger.addHandler(console_handler)

    # Disable spammy third-party logs unless debugging
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING if not settings.DEBUG else logging.INFO)
