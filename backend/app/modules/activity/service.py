from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.timeutil import utc
from ..auth.models import User
from .models import Activity
from .schemas import ActivityOut


def log(db: Session, user_id: int, action: str, resource_type: str, resource_id: str, message: str) -> None:
    db.add(Activity(owner_id=user_id, action=action, resource_type=resource_type,
                    resource_id=str(resource_id), message=message))


def activity_out(a: Activity) -> ActivityOut:
    return ActivityOut(id=a.id, action=a.action, resource_type=a.resource_type, resource_id=a.resource_id,
                       message=a.message, created_at=utc(a.created_at))


def recent_activity(db: Session, user: User, limit: int) -> list[Activity]:
    return list(db.scalars(select(Activity).where(Activity.owner_id == user.id)
                           .order_by(Activity.id.desc()).limit(limit)))
