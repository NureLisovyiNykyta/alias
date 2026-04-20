from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.core.security import generate_token_pair
from app.schemas.base import StatusResponse
from app.schemas.token import Token, TokenRefresh
from app.schemas.user import (
    EmailCheck,
    UserCreate,
    UserGoogleLogin,
    UserGoogleRegister,
    UserLogin,
    UsernameCheck,
)
from app.services.user import (
    authenticate_user,
    check_email_unique,
    check_username_unique,
    create_user,
    get_user_by_email,
    mock_verify_google_token,
    refresh_user_tokens,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/check-email", response_model=StatusResponse)
async def check_email(body: EmailCheck, db: AsyncSession = Depends(get_db)) -> StatusResponse:
    await check_email_unique(db, body.email)
    return StatusResponse()


@router.post("/check-username", response_model=StatusResponse)
async def check_username(body: UsernameCheck, db: AsyncSession = Depends(get_db)) -> StatusResponse:
    await check_username_unique(db, body.username)
    return StatusResponse()


@router.post("/register", response_model=Token)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)) -> Token:
    user = await create_user(db, email=body.email, username=body.username, password=body.password)
    return generate_token_pair(str(user.id))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    user = await authenticate_user(db, email=body.email, password=body.password)
    return generate_token_pair(str(user.id))


@router.post("/google/register", response_model=Token)
async def google_register(body: UserGoogleRegister, db: AsyncSession = Depends(get_db)) -> Token:
    email = mock_verify_google_token(body.google_token)
    user = await create_user(
        db,
        email=email,
        username=body.username,
        password=body.password,
        google_id=body.google_token,
    )
    return generate_token_pair(str(user.id))


@router.post("/google/login", response_model=Token)
async def google_login(body: UserGoogleLogin, db: AsyncSession = Depends(get_db)) -> Token:
    email = mock_verify_google_token(body.google_token)
    user = await get_user_by_email(db, email)
    return generate_token_pair(str(user.id))


@router.post("/refresh", response_model=Token)
async def refresh(body: TokenRefresh, db: AsyncSession = Depends(get_db)) -> Token:
    user = await refresh_user_tokens(db, body.refresh_token)
    return generate_token_pair(str(user.id))
