from fastapi import Depends
from sqlalchemy.orm import Session

from ...core.db import get_db
from ..auth.models import User
from ..auth.security import current_user
from . import service
from .schemas import CliRequest, CliResponse


def run_cli(body: CliRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    output, exit_code = service.run(db, user, body.command)
    return CliResponse(output=output, exit_code=exit_code)
