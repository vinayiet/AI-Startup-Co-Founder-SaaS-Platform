from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class BaseAppException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400, details: Optional[Any] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundException(BaseAppException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND, details)


class AuthenticationException(BaseAppException):
    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None):
        super().__init__(message, "UNAUTHENTICATED", status.HTTP_401_UNAUTHORIZED, details)


class AuthorizationException(BaseAppException):
    def __init__(self, message: str = "Not authorized to perform this action", details: Optional[Any] = None):
        super().__init__(message, "UNAUTHORIZED", status.HTTP_403_FORBIDDEN, details)


class ValidationException(BaseAppException):
    def __init__(self, message: str = "Validation error occurred", details: Optional[Any] = None):
        super().__init__(message, "VALIDATION_ERROR", status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class ResourceLimitException(BaseAppException):
    def __init__(self, message: str = "Subscription tier limit exceeded", details: Optional[Any] = None):
        super().__init__(message, "LIMIT_EXCEEDED", status.HTTP_402_PAYMENT_REQUIRED, details)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Avoid leaking internal system traces in production
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred.",
                    "details": str(exc) if app.debug else None
                }
            }
        )
