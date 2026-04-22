import datetime
import secrets
import string

import bcrypt
import jwt

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.messages import ErrorMessage

_ALGORITHM = "HS256"


def generate_verification_code() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(
    data: dict,
    expires_delta: datetime.timedelta | None = None,
) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {**data, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {**data, "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=_ALGORITHM)


def generate_token_pair(user_id: str) -> "Token":
    from app.schemas.token import Token

    data = {"sub": user_id}
    return Token(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


def decode_token(token: str, expected_type: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        raise UnauthorizedError(ErrorMessage.TOKEN_INVALID)
    if payload.get("type") != expected_type:
        raise UnauthorizedError(ErrorMessage.TOKEN_INVALID_TYPE)
    sub: str | None = payload.get("sub")
    if sub is None:
        raise UnauthorizedError(ErrorMessage.TOKEN_INVALID)
    return sub


def decode_access_token(token: str) -> str:
    return decode_token(token, "access")


def decode_refresh_token(token: str) -> str:
    return decode_token(token, "refresh")
