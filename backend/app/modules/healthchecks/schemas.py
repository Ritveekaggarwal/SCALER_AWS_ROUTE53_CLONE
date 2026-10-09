from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthCheckIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    protocol: Literal["HTTP", "HTTPS", "TCP"] = "HTTP"
    ip_address: str | None = None
    domain_name: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    resource_path: str = Field(default="/", max_length=1024)
    search_string: str = Field(default="", max_length=255)
    request_interval: Literal[10, 30] = 30
    failure_threshold: int = Field(default=3, ge=1, le=10)
    inverted: bool = False
    disabled: bool = False


class HealthCheckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    ip_address: str | None = None
    domain_name: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    resource_path: str | None = Field(default=None, max_length=1024)
    search_string: str | None = Field(default=None, max_length=255)
    failure_threshold: int | None = Field(default=None, ge=1, le=10)
    inverted: bool | None = None
    disabled: bool | None = None


class HealthCheckOut(BaseModel):
    id: str
    name: str
    protocol: str
    ip_address: str | None
    domain_name: str | None
    port: int
    resource_path: str
    search_string: str
    request_interval: int
    failure_threshold: int
    inverted: bool
    disabled: bool
    status: str
    last_checked_at: datetime | None
    last_latency_ms: int | None
    last_message: str
    endpoint: str
    record_count: int = 0
    created_at: datetime


class HealthCheckResultOut(BaseModel):
    checked_at: datetime
    success: bool
    latency_ms: int | None
    status_code: int | None
    message: str
