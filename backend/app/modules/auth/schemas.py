from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    account_id: str = ""
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    account_id: str
    account_alias: str
    display_name: str
    email: str
    created_at: datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9+=,.@_-]+$")
    password: str = Field(min_length=8, max_length=128)
    account_alias: str = Field(min_length=3, max_length=63, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
    display_name: str = Field(default="", max_length=128)
    email: str = Field(default="", max_length=255)


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    account_alias: str | None = Field(default=None, min_length=3, max_length=63, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class SessionOut(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime
    current: bool
