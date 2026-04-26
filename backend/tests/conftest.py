import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.api.dependencies import get_db
from app.core.config import settings
from app.core.security import generate_token_pair
from app.db.session import Base
from app.main import app
from app.models.card import CardPack, CardType
from app.models.enums import CardMechanicEnum, StatusEnum
from app.models.map import Map, MapTemplate
from app.models.user import User

_TEST_SCHEMA = "test_schema"

# Shared test data constants
VALID_CARD_CONTENT = {"word": "Apple"}
MAP_FIELD_0 = {"position_index": 0, "time_limit": 60, "award": 1, "penalty": 1}
MAP_FIELD_1 = {"position_index": 1, "time_limit": 60, "award": 1, "penalty": 1}


@pytest.fixture(autouse=True)
def mock_email_sender():
    with patch("app.api.v1.auth.send_code_email", new_callable=AsyncMock) as mock_send:
        yield mock_send


@pytest.fixture(autouse=True)
def mock_password_hashing():
    _hash = lambda p: f"test_hash_{p}"  # noqa: E731
    _verify = lambda plain, hashed: hashed == f"test_hash_{plain}"  # noqa: E731
    with (
        patch("app.services.user.get_password_hash", side_effect=_hash),
        patch("app.services.user.verify_password", side_effect=_verify),
        patch("app.services.auth.get_password_hash", side_effect=_hash),
        patch("app.services.auth.verify_password", side_effect=_verify),
    ):
        yield


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


# ── Session-scoped user IDs: created once, committed to DB ──────────────────

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _test_user_id(engine: AsyncEngine, setup_test_db: None) -> uuid.UUID:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            username="testuser",
            nickname="testuser",
            password_hash="test_hash_testpassword123",
        )
        session.add(user)
        await session.commit()
        return user.id


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _second_user_id(engine: AsyncEngine, setup_test_db: None) -> uuid.UUID:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        user = User(
            id=uuid.uuid4(),
            email="second@example.com",
            username="seconduser",
            nickname="seconduser",
            password_hash="test_hash_secondpassword123",
        )
        session.add(user)
        await session.commit()
        return user.id


# ── Per-test fixtures ────────────────────────────────────────────────────────

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
async def test_user(test_db: AsyncSession, _test_user_id: uuid.UUID) -> User:
    return (await test_db.execute(select(User).where(User.id == _test_user_id))).scalar_one()


@pytest.fixture
def tokens(test_user: User) -> dict[str, str]:
    pair = generate_token_pair(str(test_user.id))
    return {"access_token": pair.access_token, "refresh_token": pair.refresh_token}


@pytest.fixture
def auth_headers(tokens: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest_asyncio.fixture
async def second_user(test_db: AsyncSession, _second_user_id: uuid.UUID) -> User:
    return (await test_db.execute(select(User).where(User.id == _second_user_id))).scalar_one()


@pytest.fixture
def second_user_tokens(second_user: User) -> dict[str, str]:
    pair = generate_token_pair(str(second_user.id))
    return {"access_token": pair.access_token, "refresh_token": pair.refresh_token}


@pytest.fixture
def second_user_auth_headers(second_user_tokens: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {second_user_tokens['access_token']}"}


@pytest_asyncio.fixture
async def test_card_type(test_db: AsyncSession) -> CardType:
    card_type = CardType(
        id=uuid.uuid4(),
        code="alias",
        name="Alias",
        description="Classic alias card type",
        core_mechanic=CardMechanicEnum.CLASSIC_ALIAS.value,
        allowed_modifiers=[],
        schema={
            "type": "object",
            "properties": {"word": {"type": "string"}},
            "required": ["word"],
        },
    )
    test_db.add(card_type)
    await test_db.flush()
    return card_type


@pytest_asyncio.fixture
async def test_pack(test_db: AsyncSession, test_card_type: CardType, test_user: User) -> dict:
    pack = CardPack(
        id=uuid.uuid4(),
        name="Test Pack",
        description="A test card pack",
        is_public=False,
        type_id=test_card_type.id,
        author_id=test_user.id,
        status=StatusEnum.DRAFT.value,
    )
    test_db.add(pack)
    await test_db.flush()
    return {"id": str(pack.id), "name": pack.name, "author_id": str(pack.author_id), "status": pack.status}


@pytest_asyncio.fixture
async def test_pack_second_user(test_db: AsyncSession, test_card_type: CardType, second_user: User) -> dict:
    pack = CardPack(
        id=uuid.uuid4(),
        name="Second User Pack",
        description="A second user card pack",
        is_public=False,
        type_id=test_card_type.id,
        author_id=second_user.id,
        status=StatusEnum.DRAFT.value,
    )
    test_db.add(pack)
    await test_db.flush()
    return {"id": str(pack.id), "name": pack.name, "author_id": str(pack.author_id), "status": pack.status}


@pytest_asyncio.fixture
async def test_map_template(test_db: AsyncSession) -> MapTemplate:
    template = MapTemplate(
        id=uuid.uuid4(),
        code="standard",
        name="Standard",
        max_fields_count=50,
    )
    test_db.add(template)
    await test_db.flush()
    return template


@pytest_asyncio.fixture
async def small_map_template(test_db: AsyncSession) -> MapTemplate:
    template = MapTemplate(
        id=uuid.uuid4(),
        code="small",
        name="Small",
        max_fields_count=2,
    )
    test_db.add(template)
    await test_db.flush()
    return template


@pytest_asyncio.fixture
async def created_pack(test_db: AsyncSession, test_card_type: CardType, test_user: User) -> dict:
    """Public DRAFT pack owned by test_user. Use for card-pack endpoint tests."""
    pack = CardPack(
        id=uuid.uuid4(),
        name="Test Pack",
        description="A test card pack",
        is_public=True,
        type_id=test_card_type.id,
        author_id=test_user.id,
        status=StatusEnum.DRAFT.value,
    )
    test_db.add(pack)
    await test_db.flush()
    return {"id": str(pack.id), "name": pack.name, "author_id": str(pack.author_id), "status": pack.status}


@pytest_asyncio.fixture
async def created_map(test_db: AsyncSession, test_map_template: MapTemplate, test_user: User) -> dict:
    """Public DRAFT map owned by test_user. Use for map endpoint tests."""
    map_obj = Map(
        id=uuid.uuid4(),
        name="Test Map",
        is_public=True,
        template_id=test_map_template.id,
        author_id=test_user.id,
        status=StatusEnum.DRAFT.value,
    )
    test_db.add(map_obj)
    await test_db.flush()
    return {"id": str(map_obj.id), "name": map_obj.name, "author_id": str(map_obj.author_id), "status": map_obj.status}


@pytest_asyncio.fixture
async def small_map(test_db: AsyncSession, small_map_template: MapTemplate, test_user: User) -> dict:
    map_obj = Map(
        id=uuid.uuid4(),
        name="Small Map",
        is_public=True,
        template_id=small_map_template.id,
        author_id=test_user.id,
        status=StatusEnum.DRAFT.value,
    )
    test_db.add(map_obj)
    await test_db.flush()
    return {"id": str(map_obj.id), "name": map_obj.name, "author_id": str(map_obj.author_id), "status": map_obj.status}
