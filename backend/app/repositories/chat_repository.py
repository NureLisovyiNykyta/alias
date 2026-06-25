import redis.asyncio as aioredis

from app.core.config import settings
from app.schemas.chat import ChatMessage

_ROOM_CHAT_PREFIX = "chat:room:"
_TEAM_CHAT_PREFIX = "chat:team:"


class ChatRepository:
    def __init__(self, redis: aioredis.Redis) -> None:
        self.redis = redis

    # ------------------------------------------------------------------
    # Key builders
    # ------------------------------------------------------------------

    @staticmethod
    def _room_key(room_code: str) -> str:
        return f"{_ROOM_CHAT_PREFIX}{room_code}"

    @staticmethod
    def _team_key(room_code: str, team_id: str) -> str:
        return f"{_TEAM_CHAT_PREFIX}{room_code}:{team_id}"

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def _append_message(self, key: str, message: ChatMessage) -> None:
        """Atomically appends a message, trims the list, and refreshes TTL."""
        async with self.redis.pipeline(transaction=True) as pipe:
            await pipe.rpush(key, message.model_dump_json())
            await pipe.ltrim(key, -settings.CHAT_MAX_MESSAGES_PER_CHANNEL, -1)
            await pipe.expire(key, settings.CHAT_TTL_SECONDS)
            await pipe.execute()

    async def save_room_message(self, room_code: str, message: ChatMessage) -> None:
        await self._append_message(self._room_key(room_code), message)

    async def save_team_message(self, room_code: str, team_id: str, message: ChatMessage) -> None:
        await self._append_message(self._team_key(room_code, team_id), message)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_room_messages(self, room_code: str) -> list[ChatMessage]:
        raw: list[str] = await self.redis.lrange(self._room_key(room_code), 0, -1)
        return [ChatMessage.model_validate_json(m) for m in raw]

    async def get_team_messages(self, room_code: str, team_id: str) -> list[ChatMessage]:
        raw: list[str] = await self.redis.lrange(self._team_key(room_code, team_id), 0, -1)
        return [ChatMessage.model_validate_json(m) for m in raw]
