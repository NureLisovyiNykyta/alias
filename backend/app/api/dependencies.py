from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.messages import ErrorMessage
from app.core.security import decode_access_token
from app.db.redis import get_redis
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.repositories.card_repository import CardRepository
from app.repositories.game_repository import GameRepository
from app.repositories.map_repository import MapRepository
from app.services.game import GameService
from app.services.room import RoomService
from app.services.team import TeamService
from app.services.user import get_user_by_id
from app.ws.connection_manager import ConnectionManager, manager

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


async def get_game_repo(
    redis: aioredis.Redis = Depends(get_redis),
) -> GameRepository:
    return GameRepository(redis)


async def get_map_repo(
    db: AsyncSession = Depends(get_db),
) -> MapRepository:
    return MapRepository(db=db)


async def get_card_repo(
    db: AsyncSession = Depends(get_db),
) -> CardRepository:
    return CardRepository(db=db)


def get_connection_manager() -> ConnectionManager:
    return manager


async def get_room_service(
    game_repo: GameRepository = Depends(get_game_repo),
    map_repo: MapRepository = Depends(get_map_repo),
    card_repo: CardRepository = Depends(get_card_repo),
    conn_manager: ConnectionManager = Depends(get_connection_manager),
) -> RoomService:
    return RoomService(game_repo=game_repo, map_repo=map_repo, card_repo=card_repo, conn_manager=conn_manager)


async def get_team_service(
    game_repo: GameRepository = Depends(get_game_repo),
    conn_manager: ConnectionManager = Depends(get_connection_manager),
) -> TeamService:
    return TeamService(game_repo=game_repo, conn_manager=conn_manager)


async def get_game_service(
    game_repo: GameRepository = Depends(get_game_repo),
    conn_manager: ConnectionManager = Depends(get_connection_manager),
    db: AsyncSession = Depends(get_db),
) -> GameService:
    return GameService(game_repo=game_repo, conn_manager=conn_manager, db=db)

