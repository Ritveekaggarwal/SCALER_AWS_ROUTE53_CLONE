from datetime import datetime

from pydantic import BaseModel, Field


class HostedZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    comment: str = Field(default="", max_length=256)
    is_private: bool = False
    vpc_region: str | None = None
    vpc_id: str | None = None


class HostedZoneUpdate(BaseModel):
    comment: str = Field(max_length=256)


class HostedZoneOut(BaseModel):
    id: str
    name: str
    is_private: bool
    comment: str
    record_count: int
    caller_reference: str
    vpc_region: str | None
    vpc_id: str | None
    name_servers: list[str]
    created_by: str = "Route 53"
    created_at: datetime
    updated_at: datetime
