from fastapi import Depends, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ..auth.models import User
from ..auth.security import current_user
from . import service


def search(q: str = Query(min_length=1, max_length=255), db: Session = Depends(get_db),
           user: User = Depends(current_user)):
    return service.search_console(db, user, q)
