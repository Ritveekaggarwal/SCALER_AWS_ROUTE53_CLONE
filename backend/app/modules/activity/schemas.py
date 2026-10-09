from datetime import datetime

from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: int
    action: str
    resource_type: str
    resource_id: str
    message: str
    created_at: datetime
