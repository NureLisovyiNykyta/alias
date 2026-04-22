from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.core.messages import EmailTemplate
from app.core.security import generate_token_pair
from app.models.user import User
from app.schemas.base import StatusResponse
from app.schemas.token import Token, TokenRefresh
from app.schemas.user import (
    EmailCheck,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserCreate,
    UserGoogleLogin,
    UserGoogleRegister,
    UsernameCheck,
    VerificationCodeVerify,
)
from app.services.auth import (
    authenticate_user,
    create_password_reset_code,
    link_google_account,
    refresh_user_tokens,
    reset_user_password,
    set_new_verification_code_for_user,
    verify_google_token,
    verify_user_code,
)
from app.services.email import send_code_email
from app.services.user import (
    check_email_unique,
    check_username_unique,
    create_user,
    get_user_by_email,
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
async def register(
    body: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Token:
    user = await create_user(db, email=body.email, username=body.username, password=body.password)
    background_tasks.add_task(send_code_email, user.email, user.verification_code, EmailTemplate.VERIFY_EMAIL)
    return generate_token_pair(str(user.id))


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    user = await authenticate_user(db, login_identifier=form_data.username, password=form_data.password)
    return generate_token_pair(str(user.id))


@router.post("/google/register", response_model=Token)
async def google_register(body: UserGoogleRegister, db: AsyncSession = Depends(get_db)) -> Token:
    payload = await verify_google_token(body.google_token)
    user = await create_user(
        db,
        email=payload["email"],
        username=body.username,
        password=body.password,
        google_id=payload["sub"],
    )
    return generate_token_pair(str(user.id))


@router.post("/google/login", response_model=Token)
async def google_login(body: UserGoogleLogin, db: AsyncSession = Depends(get_db)) -> Token:
    payload = await verify_google_token(body.google_token)
    user = await get_user_by_email(db, payload["email"])
    if user.google_id is None:
        await link_google_account(db, user, payload["sub"])
    return generate_token_pair(str(user.id))


@router.post("/refresh", response_model=Token)
async def refresh(body: TokenRefresh, db: AsyncSession = Depends(get_db)) -> Token:
    user = await refresh_user_tokens(db, body.refresh_token)
    return generate_token_pair(str(user.id))


@router.post("/verify-email", response_model=StatusResponse)
async def verify_email(
    body: VerificationCodeVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    await verify_user_code(db, current_user, body.code)
    return StatusResponse()


@router.post("/resend-code", response_model=StatusResponse)
async def resend_code(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    code = await set_new_verification_code_for_user(db, current_user)
    background_tasks.add_task(send_code_email, current_user.email, code, EmailTemplate.VERIFY_EMAIL)
    return StatusResponse()


@router.post("/forgot-password", response_model=StatusResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    code = await create_password_reset_code(db, body.email)
    if code is not None:
        background_tasks.add_task(send_code_email, body.email, code, EmailTemplate.RESET_PASSWORD)
    return StatusResponse()


@router.post("/reset-password", response_model=StatusResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    await reset_user_password(db, body.email, body.code, body.new_password)
    return StatusResponse()
