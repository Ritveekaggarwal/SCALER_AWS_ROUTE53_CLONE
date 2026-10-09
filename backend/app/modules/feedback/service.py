from sqlalchemy.orm import Session

from ..auth.models import User
from .models import Feedback
from .schemas import FeedbackIn


def submit_feedback(db: Session, user: User, body: FeedbackIn) -> None:
    db.add(Feedback(owner_id=user.id, rating=body.rating, message=body.message.strip(), page=body.page))
