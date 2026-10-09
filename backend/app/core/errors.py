from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status: int, message: str, code: str = "InvalidInput"):
        super().__init__(message)
        self.status = status
        self.message = message
        self.code = code


def not_found(message: str, code: str = "NoSuchResource") -> AppError:
    return AppError(404, message, code)


def conflict(message: str, code: str) -> AppError:
    return AppError(409, message, code)


def invalid(message: str, code: str = "InvalidInput") -> AppError:
    return AppError(422, message, code)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse({"detail": exc.message, "code": exc.code}, status_code=exc.status)
