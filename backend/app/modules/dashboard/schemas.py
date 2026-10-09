from pydantic import BaseModel

from ..activity.schemas import ActivityOut


class Dashboard(BaseModel):
    hosted_zones: int
    public_zones: int
    private_zones: int
    records: int
    records_by_type: dict[str, int]
    health_checks: int
    health_by_status: dict[str, int]
    recent_activity: list[ActivityOut]
