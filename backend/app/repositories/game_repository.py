import redis.asyncio as aioredis

from app.schemas.game_room import RoomStateJSON, RoomStatus

_KEY_PREFIX = "room:"

_TTL_BY_STATUS: dict[RoomStatus, int] = {
    RoomStatus.LOBBY: 7200,
    RoomStatus.PLAYING: 14400,
    RoomStatus.FINISHED: 900,
}


class GameRepository:
    def __init__(self, redis: aioredis.Redis) -> None:
        self.redis = redis

    def _key(self, room_code: str) -> str:
        return f"{_KEY_PREFIX}{room_code}"

    async def save_room(self, room: RoomStateJSON) -> None:
        ttl = _TTL_BY_STATUS[room.status]
        await self.redis.set(self._key(room.room_code), room.model_dump_json(), ex=ttl)

    async def create_room_if_not_exists(self, room: RoomStateJSON) -> bool:
        ttl = _TTL_BY_STATUS[room.status]
        result: bool = await self.redis.set(
            self._key(room.room_code), room.model_dump_json(), ex=ttl, nx=True
        )
        return bool(result)

    async def get_room(self, room_code: str) -> RoomStateJSON | None:
        data: str | None = await self.redis.get(self._key(room_code))
        if data is None:
            return None
        return RoomStateJSON.model_validate_json(data)

    async def delete_room(self, room_code: str) -> None:
        await self.redis.delete(self._key(room_code))
