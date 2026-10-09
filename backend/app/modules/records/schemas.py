from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RecordType = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]


class RecordCreate(BaseModel):
    name: str = Field(default="", max_length=255, description="Subdomain, '@'/blank for apex, or FQDN")
    type: RecordType
    ttl: int = Field(default=300, ge=0, le=2147483647)
    values: list[str] = Field(min_length=1)
    routing_policy: Literal["Simple"] = "Simple"
    health_check_id: str | None = None


class RecordUpdate(BaseModel):
    ttl: int | None = Field(default=None, ge=0, le=2147483647)
    values: list[str] | None = Field(default=None, min_length=1)
    health_check_id: str | None = Field(default=None, description="Set to '' to detach the health check")


class RecordOut(BaseModel):
    id: int
    name: str
    type: str
    ttl: int
    routing_policy: str
    values: list[str]
    alias: bool = False
    health_check_id: str | None = None
    protected: bool
    created_at: datetime
    updated_at: datetime


class ImportRequest(BaseModel):
    zone_file: str = Field(min_length=1)
    dry_run: bool = True


class ImportedRecord(BaseModel):
    name: str
    type: str
    ttl: int
    values: list[str]
    status: Literal["new", "conflict", "skipped"]
    reason: str = ""


class ImportResult(BaseModel):
    records: list[ImportedRecord]
    created: int
    dry_run: bool


class DnsAnswer(BaseModel):
    name: str
    type: str
    ttl: int
    value: str


class DnsTestResult(BaseModel):
    query_name: str
    query_type: str
    response_code: Literal["NOERROR", "NXDOMAIN"]
    protocol: str = "UDP"
    answers: list[DnsAnswer]
