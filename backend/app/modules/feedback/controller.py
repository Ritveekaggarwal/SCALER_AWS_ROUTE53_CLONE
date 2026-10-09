from fastapi import Depends
from sqlalchemy.orm import Session

from ...core.db import get_db
from ..auth.models import User
from ..auth.security import current_user
from . import service
from .schemas import FeedbackIn


def feedback(body: FeedbackIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    service.submit_feedback(db, user, body)
    db.commit()
