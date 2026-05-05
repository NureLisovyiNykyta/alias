from typing import AsyncGenerator

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.messages import ErrorMessage

_pool: aioredis.ConnectionPool | None = None
_client: aioredis.Redis | None = None


async def connect_to_redis() -> None:
    global _pool, _client
    _pool = aioredis.ConnectionPool.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    _client = aioredis.Redis(connection_pool=_pool)


async def close_redis_connection() -> None:
    global _pool, _client
    if _client is not None:
        await _client.aclose()
        _client = None
    if _pool is not None:
        await _pool.aclose()
        _pool = None


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    if _client is None:
        raise RuntimeError(ErrorMessage.REDIS_NOT_INITIALISED)
    yield _client
