import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.config import ALLOW_SIGNUP
from ...core.errors import AppError, conflict, invalid
from .models import User, UserSession
from .schemas import LoginRequest, PasswordChange, ProfileUpdate, RegisterRequest, SessionOut
from .security import as_utc, hash_password, verify_password


def session_id(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()[:16]


def authenticate(db: Session, body: LoginRequest) -> User:
    user = db.scalar(select(User).where(User.username == body.username.strip()))
    account = body.account_id.strip()
    if account.replace("-", "").isdigit():
        account = account.replace("-", "")
    if (
        not user
        or (account and account not in (user.account_id, user.account_alias))
        or not verify_password(body.password, user.password_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your authentication information is incorrect. Please try again.")
    return user


def register_user(db: Session, body: RegisterRequest) -> User:
    if not ALLOW_SIGNUP:
        raise AppError(403, "Sign-up is disabled on this server.", "SignupDisabled")
    if db.scalar(select(User).where(User.username == body.username)):
        raise conflict("That user name is already taken.", "EntityAlreadyExists")
    if db.scalar(select(User).where(User.account_alias == body.account_alias)):
        raise conflict("That account alias is already taken.", "EntityAlreadyExists")
    account_id = "".join(secrets.choice("0123456789") for _ in range(12))
    while db.scalar(select(User).where(User.account_id == account_id)):
        account_id = "".join(secrets.choice("0123456789") for _ in range(12))
    user = User(username=body.username, password_hash=hash_password(body.password), account_id=account_id,
                account_alias=body.account_alias, display_name=body.display_name.strip() or body.username,
                email=body.email.strip())
    db.add(user)
    db.commit()
    return user


def end_session(db: Session, token: str | None) -> None:
    if token and (session := db.get(UserSession, token)):
        db.delete(session)
        db.commit()


def update_profile(db: Session, user: User, body: ProfileUpdate) -> User:
    if body.account_alias and body.account_alias != user.account_alias:
        if db.scalar(select(User).where(User.account_alias == body.account_alias)):
            raise conflict("That account alias is already taken.", "EntityAlreadyExists")
        user.account_alias = body.account_alias
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.email is not None:
        user.email = body.email.strip()
    db.commit()
    return user


def change_password(db: Session, user: User, body: PasswordChange, token: str | None) -> None:
    if not verify_password(body.current_password, user.password_hash):
        raise invalid("The current password is incorrect.", "InvalidPassword")
    user.password_hash = hash_password(body.new_password)
    for s in list(user.sessions):
        if s.token != token:
            db.delete(s)
    db.commit()


def list_sessions(user: User, token: str | None) -> list[SessionOut]:
    now = datetime.now(timezone.utc)
    return [
        SessionOut(id=session_id(s.token), created_at=as_utc(s.created_at), expires_at=as_utc(s.expires_at),
                   current=s.token == token)
        for s in sorted(user.sessions, key=lambda s: s.created_at, reverse=True)
        if as_utc(s.expires_at) > now
    ]


def revoke_session(db: Session, user: User, target_id: str) -> None:
    for s in user.sessions:
        if session_id(s.token) == target_id:
            db.delete(s)
            db.commit()
            return
    raise AppError(404, "Session not found.", "NoSuchEntity")
