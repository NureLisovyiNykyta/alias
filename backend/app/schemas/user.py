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


class UserUpdateProfile(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    nickname: str
    avatar_url: str | None
    is_email_verified: bool


class UserPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nickname: str
    avatar_url: str | None


class UserChangePassword(BaseModel):
    old_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class VerificationCodeVerify(BaseModel):
    code: str
