from fastapi import Cookie, Depends, Response
from sqlalchemy.orm import Session

from ...core.config import ALLOW_SIGNUP, COOKIE_SECURE, SEED_ON_STARTUP, SESSION_COOKIE, SESSION_TTL_HOURS
from ...core.db import get_db
from . import service
from .models import User
from .schemas import LoginRequest, PasswordChange, ProfileUpdate, RegisterRequest
from .security import create_session, current_user


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_TTL_HOURS * 3600, httponly=True, samesite="lax",
                        secure=COOKIE_SECURE, path="/")


def auth_config():
    return {"signup_enabled": ALLOW_SIGNUP, "demo_enabled": SEED_ON_STARTUP}


def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = service.authenticate(db, body)
    _set_cookie(response, create_session(db, user).token)
    return user


def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    user = service.register_user(db, body)
    _set_cookie(response, create_session(db, user).token)
    return user


def logout(response: Response, db: Session = Depends(get_db),
           token: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    service.end_session(db, token)
    response.delete_cookie(SESSION_COOKIE, path="/")


def me(user: User = Depends(current_user)):
    return user


def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return service.update_profile(db, user, body)


def change_password(body: PasswordChange, db: Session = Depends(get_db), user: User = Depends(current_user),
                    token: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    service.change_password(db, user, body, token)


def sessions(user: User = Depends(current_user), token: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    return service.list_sessions(user, token)


def revoke_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    service.revoke_session(db, user, session_id)
