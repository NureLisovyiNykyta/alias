from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.base import StatusResponse
from app.schemas.user import UserChangePassword, UserPublicRead, UserRead, UserUpdateProfile
from app.services.user import change_user_password, get_public_user_by_username, update_user_profile

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    body: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await update_user_profile(db, current_user, body.model_dump(exclude_unset=True))


@router.post("/me/password", response_model=StatusResponse)
async def change_password(
    body: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    await change_user_password(db, current_user, body.old_password, body.new_password)
    return StatusResponse()


@router.get("/{username}", response_model=UserPublicRead)
async def get_user_by_username(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await get_public_user_by_username(db, username)
