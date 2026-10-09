from fastapi import Depends, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ..auth.models import User
from ..auth.security import current_user
from . import service
from .schemas import ActivityOut


def list_activity(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                  user: User = Depends(current_user)) -> list[ActivityOut]:
    return [service.activity_out(a) for a in service.recent_activity(db, user, limit)]
