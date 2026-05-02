import asyncio
import datetime
import uuid

import dns.resolver
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsError, BadRequestError, BusinessLogicError, NotFoundError, UnauthorizedError
from app.core.messages import ErrorMessage
from app.core.security import generate_verification_code, get_password_hash, verify_password
from app.models.card import CardPack
from app.models.map import Map
from app.models.user import User


async def check_email_domain_mx(email: str) -> None:
    domain = email.split("@")[1]
    try:
        await asyncio.to_thread(dns.resolver.resolve, domain, "MX")
    except Exception:
        raise BadRequestError(ErrorMessage.EMAIL_DOMAIN_INVALID)


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

    if google_id is not None:
        user.is_email_verified = True
    else:
        code = generate_verification_code()
        user.verification_code = code
        user.verification_code_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)

    db.add(user)
    await db.commit()
    await db.refresh(user)
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


async def update_user_profile(db: AsyncSession, user: User, update_data: dict) -> User:
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def change_user_password(
    db: AsyncSession,
    user: User,
    old_password: str,
    new_password: str,
) -> None:
    if user.password_hash is None:
        raise BusinessLogicError(ErrorMessage.GOOGLE_USER_NO_PASSWORD)
    if not verify_password(old_password, user.password_hash):
        raise BadRequestError(ErrorMessage.INVALID_OLD_PASSWORD)
    user.password_hash = get_password_hash(new_password)
    await db.commit()


async def get_public_user_by_username(db: AsyncSession, username: str) -> User:
    result = await db.execute(select(User).where(User.username == username))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError(ErrorMessage.USER_NOT_FOUND)
    return user


async def delete_account(db: AsyncSession, user: User) -> None:
    now = datetime.datetime.now(datetime.timezone.utc)
    suffix = uuid.uuid4().hex

    user.email = f"deleted_{suffix}"
    user.username = f"deleted_{suffix}"
    user.nickname = "Deleted account"
    user.password_hash = None
    user.avatar_url = None
    user.google_id = None
    user.is_email_verified = False
    user.verification_code = None
    user.verification_code_expires_at = None
    user.reset_password_code = None
    user.reset_password_code_expires_at = None
    user.deleted_at = now

    await db.execute(
        update(Map)
        .where(Map.author_id == user.id, Map.is_public.is_(False), Map.deleted_at.is_(None))
        .values(deleted_at=now)
    )
    await db.execute(
        update(CardPack)
        .where(CardPack.author_id == user.id, CardPack.is_public.is_(False), CardPack.deleted_at.is_(None))
        .values(deleted_at=now)
    )

    await db.commit()
