from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.messages import ErrorMessage
from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.user import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_access_token(token)
    user = await get_user_by_id(db, user_id)
    if user.deleted_at is not None:
        raise UnauthorizedError(ErrorMessage.ACCOUNT_DELETED)
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if token is None:
        return None
    user_id = decode_access_token(token)
    return await get_user_by_id(db, user_id)
