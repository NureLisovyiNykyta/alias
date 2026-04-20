import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsError, NotFoundError, UnauthorizedError
from app.core.messages import ErrorMessage
from app.core.security import decode_refresh_token, get_password_hash, verify_password
from app.models.user import User


async def check_email_unique(db: AsyncSession, email: str) -> None:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise AlreadyExistsError(ErrorMessage.EMAIL_TAKEN)


async def check_username_unique(db: AsyncSession, username: str) -> None:
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none() is not None:
        raise AlreadyExistsError(ErrorMessage.USERNAME_TAKEN)


async def create_user(
    db: AsyncSession,
    email: str,
    username: str,
    password: str,
    google_id: str | None = None,
) -> User:
    await check_email_unique(db, email)
    await check_username_unique(db, username)

    user = User(
        id=uuid.uuid4(),
        email=email,
        username=username,
        nickname=username,
        password_hash=get_password_hash(password),
        google_id=google_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()
    if user is None or user.password_hash is None:
        raise UnauthorizedError(ErrorMessage.INVALID_CREDENTIALS)
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError(ErrorMessage.INVALID_CREDENTIALS)
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError(ErrorMessage.USER_NOT_FOUND)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError(ErrorMessage.USER_NOT_FOUND)
    return user


async def refresh_user_tokens(db: AsyncSession, refresh_token: str) -> User:
    user_id_str = decode_refresh_token(refresh_token)
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError(ErrorMessage.USER_NOT_FOUND)
    return user


def mock_verify_google_token(token: str) -> str:
    """Temporary stub — returns a deterministic fake email from the token value."""
    return f"{token}@gmail.com"
