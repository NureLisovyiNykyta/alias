import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmailCheck(BaseModel):
    email: EmailStr


class UsernameCheck(BaseModel):
    username: str


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8)


class UserGoogleRegister(BaseModel):
    google_token: str
    username: str
    password: str = Field(min_length=8)


class UserGoogleLogin(BaseModel):
    google_token: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdateProfile(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None
    is_registration_finished: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    nickname: str
    avatar_url: str | None
    is_registration_finished: bool
