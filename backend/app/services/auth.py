import asyncio
import datetime
import uuid

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, BusinessLogicError, UnauthorizedError
from app.core.messages import ErrorMessage
from app.core.security import decode_refresh_token, generate_verification_code, get_password_hash, verify_password
from app.models.user import User


async def set_new_verification_code_for_user(db: AsyncSession, user: User) -> str:
    if user.is_email_verified:
        raise BusinessLogicError(ErrorMessage.EMAIL_ALREADY_VERIFIED)
    code = generate_verification_code()
    user.verification_code = code
    user.verification_code_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    await db.commit()
    return code


async def verify_user_code(db: AsyncSession, user: User, code: str) -> None:
    if user.is_email_verified:
        raise BusinessLogicError(ErrorMessage.EMAIL_ALREADY_VERIFIED)
    if user.verification_code != code:
        raise BadRequestError(ErrorMessage.VERIFICATION_CODE_INVALID)
    if user.verification_code_expires_at is None or user.verification_code_expires_at < datetime.datetime.now(datetime.timezone.utc):
        raise BadRequestError(ErrorMessage.VERIFICATION_CODE_EXPIRED)
    user.is_email_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    await db.commit()


async def authenticate_user(db: AsyncSession, login_identifier: str, password: str) -> User:
    if "@" in login_identifier:
        query = select(User).where(User.email == login_identifier)
    else:
        query = select(User).where(User.username == login_identifier)
    result = await db.execute(query)
    user: User | None = result.scalar_one_or_none()
    if user is None or user.password_hash is None:
        raise UnauthorizedError(ErrorMessage.INVALID_CREDENTIALS)
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError(ErrorMessage.INVALID_CREDENTIALS)
    return user


async def refresh_user_tokens(db: AsyncSession, refresh_token: str) -> User:
    user_id_str = decode_refresh_token(refresh_token)
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError(ErrorMessage.USER_NOT_FOUND)
    return user


async def verify_google_token(token: str) -> dict:
    try:
        payload = await asyncio.to_thread(
            id_token.verify_oauth2_token,
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception:
        raise UnauthorizedError(ErrorMessage.GOOGLE_TOKEN_INVALID)
    if not payload.get("email_verified"):
        raise UnauthorizedError(ErrorMessage.GOOGLE_TOKEN_INVALID)
    return payload


async def link_google_account(db: AsyncSession, user: User, google_id: str) -> None:
    user.google_id = google_id
    user.is_email_verified = True
    await db.commit()


async def create_password_reset_code(db: AsyncSession, email: str) -> str | None:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()
    if user is None or user.password_hash is None:
        return None
    code = generate_verification_code()
    user.reset_password_code = code
    user.reset_password_code_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    await db.commit()
    return code


async def reset_user_password(db: AsyncSession, email: str, code: str, new_password: str) -> None:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()
    if (
        user is None
        or user.reset_password_code != code
        or user.reset_password_code_expires_at is None
        or user.reset_password_code_expires_at < datetime.datetime.now(datetime.timezone.utc)
    ):
        raise BadRequestError(ErrorMessage.RESET_CODE_INVALID)
    user.password_hash = get_password_hash(new_password)
    user.reset_password_code = None
    user.reset_password_code_expires_at = None
    await db.commit()
