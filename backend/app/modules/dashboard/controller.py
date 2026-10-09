from fastapi import Depends
from sqlalchemy.orm import Session

from ...core.db import get_db
from ..auth.models import User
from ..auth.security import current_user
from . import service


def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return service.build_dashboard(db, user)
