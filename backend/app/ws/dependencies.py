import uuid

from fastapi import WebSocketException

from app.core.exceptions import AppException
from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.services.user import get_user_by_id

_WS_UNAUTHORIZED = 4001
_WS_FORBIDDEN = 4003
_WS_NOT_FOUND = 4004


async def get_ws_player_id(
    token: str | None = None,
    guest_id: str | None = None,
) -> uuid.UUID:
    if token is not None:
        try:
            user_id_str = decode_access_token(token)
            async with AsyncSessionLocal() as db:
                user = await get_user_by_id(db, user_id_str)
            return user.id
        except (AppException, ValueError):
            raise WebSocketException(code=_WS_UNAUTHORIZED)

    if guest_id is not None:
        try:
            return uuid.UUID(guest_id)
        except ValueError:
            raise WebSocketException(code=_WS_UNAUTHORIZED)

    raise WebSocketException(code=_WS_UNAUTHORIZED)
