from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.api.dependencies import get_db
from app.core.config import settings
from app.db.session import Base
from app.main import app
from app.models.user import User
from app.services.user import create_user

_TEST_SCHEMA = "test_schema"


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    _engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        execution_options={"schema_translate_map": {None: _TEST_SCHEMA}},
    )
    yield _engine
    await _engine.dispose()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def setup_test_db(engine: AsyncEngine) -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.execute(text(f'DROP SCHEMA IF EXISTS "{_TEST_SCHEMA}" CASCADE'))
        await conn.execute(text(f'CREATE SCHEMA "{_TEST_SCHEMA}"'))
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.execute(text(f'DROP SCHEMA IF EXISTS "{_TEST_SCHEMA}" CASCADE'))


@pytest_asyncio.fixture
async def test_db(engine: AsyncEngine, setup_test_db: None) -> AsyncGenerator[AsyncSession, None]:
    async with engine.connect() as conn:
        transaction = await conn.begin()
        session = AsyncSession(
            bind=conn,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )

        yield session

        await session.close()
        await transaction.rollback()


@pytest_asyncio.fixture
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession) -> User:
    return await create_user(
        test_db,
        email="test@example.com",
        username="testuser",
        password="testpassword123",
    )


@pytest_asyncio.fixture
async def tokens(client: AsyncClient, test_user: User) -> dict[str, str]:
    response = await client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )
    return response.json()


@pytest_asyncio.fixture
async def auth_headers(tokens: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}
