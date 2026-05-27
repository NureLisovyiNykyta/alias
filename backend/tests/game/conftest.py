import uuid
from collections.abc import AsyncGenerator
from contextlib import suppress

import pytest
import pytest_asyncio
from fakeredis import FakeAsyncRedis

from httpx import ASGITransport, AsyncClient
from httpx_ws.transport import ASGIWebSocketTransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_redis
from app.main import app
from app.models.card import CardPack, CardType
from app.models.enums import CardMechanicEnum, StatusEnum
from app.models.map import Map, MapField as MapFieldORM, MapTheme
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import (
    CardPackInfo,
    MapField,
    MapInfo,
    Player,
    RoomStateJSON,
    RoomStatus,
    Settings,
    Team,
    TeamColor,
    ThemeInfo,
)

ROOM_CODE = "TEST01"


def build_room(host_id: uuid.UUID, room_code: str = ROOM_CODE) -> RoomStateJSON:
    pack_id = uuid.uuid4()
    theme_id = uuid.uuid4()
    return RoomStateJSON(
        room_code=room_code,
        name="Test Room",
        host_id=host_id,
        status=RoomStatus.LOBBY,
        settings=Settings(),
        map_info=MapInfo(
            map_id=uuid.uuid4(),
            name="Test Map",
            max_fields_count=10,
            fields={
                0: MapField(
                    position_index=0,
                    time_limit=60,
                    award=1,
                    penalty=1,
                    card_pack_id=pack_id,
                )
            },
        ),
        theme_info=ThemeInfo(
            theme_id=theme_id,
            code="test_theme",
            name="Test Theme",
            scene_url="",
            piece_model_url="",
            color_textures={},
        ),
        teams={},
        players={
            host_id: Player(
                user_id=host_id,
                nickname="testuser",
                is_online=False,
                team_id=None,
            )
        },
        card_packs_info={
            pack_id: CardPackInfo(
                card_pack_id=pack_id,
                name="Test Pack",
                core_mechanic="alias",
                description="desc",
            )
        },
        card_queues={},
    )


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[FakeAsyncRedis, None]:
    async with FakeAsyncRedis(decode_responses=True) as client:
        yield client


@pytest.fixture
def game_repo(redis_client: FakeAsyncRedis) -> GameRepository:
    return GameRepository(redis_client)


@pytest_asyncio.fixture
async def room(game_repo: GameRepository, test_user: User) -> RoomStateJSON:
    r = build_room(host_id=test_user.id)
    await game_repo.save_room(r)
    return r


@pytest_asyncio.fixture
async def room_with_second_player(
    game_repo: GameRepository, room: RoomStateJSON, second_user: User
) -> RoomStateJSON:
    """Room that already has second_user as a player (no team)."""
    r = await game_repo.get_room(room.room_code)
    assert r is not None
    r.players[second_user.id] = Player(
        user_id=second_user.id,
        nickname="seconduser",
        is_online=False,
        team_id=None,
    )
    await game_repo.save_room(r)
    return r


@pytest_asyncio.fixture
async def ready_room(
    game_repo: GameRepository, test_user: User, second_user: User
) -> RoomStateJSON:
    """Room ready to start: 2 teams × 2 players (host + second_user + 2 guests)."""
    r = build_room(host_id=test_user.id)

    guest1_id, guest2_id = uuid.uuid4(), uuid.uuid4()
    r.players[second_user.id] = Player(user_id=second_user.id, nickname="second", is_online=False)
    r.players[guest1_id] = Player(user_id=guest1_id, nickname="guest1", is_online=False)
    r.players[guest2_id] = Player(user_id=guest2_id, nickname="guest2", is_online=False)

    team1_id, team2_id = uuid.uuid4(), uuid.uuid4()
    r.teams[team1_id] = Team(
        team_id=team1_id,
        name="Alpha",
        color=TeamColor.GREEN,
        current_position=0,
        player_ids=[test_user.id, guest1_id],
    )
    r.teams[team2_id] = Team(
        team_id=team2_id,
        name="Beta",
        color=TeamColor.BLUE,
        current_position=0,
        player_ids=[second_user.id, guest2_id],
    )

    r.players[test_user.id].team_id = team1_id
    r.players[second_user.id].team_id = team2_id
    r.players[guest1_id].team_id = team1_id
    r.players[guest2_id].team_id = team2_id

    await game_repo.save_room(r)
    return r


@pytest_asyncio.fixture
async def room_client(
    test_db: AsyncSession, redis_client: FakeAsyncRedis
) -> AsyncGenerator[AsyncClient, None]:
    async def _get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    async def _get_redis() -> AsyncGenerator[FakeAsyncRedis, None]:
        yield redis_client

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_redis] = _get_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def ws_client(
    test_db: AsyncSession, redis_client: FakeAsyncRedis
) -> AsyncGenerator[AsyncClient, None]:
    async def _get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    async def _get_redis() -> AsyncGenerator[FakeAsyncRedis, None]:
        yield redis_client

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_redis] = _get_redis

    try:
        async with AsyncClient(
            transport=ASGIWebSocketTransport(app=app), base_url="http://test"
        ) as ac:
            yield ac
    except RuntimeError:
        # ASGIWebSocketTransport uses anyio cancel scopes tied to the test task.
        # pytest-asyncio teardown runs in a separate task, causing RuntimeError
        # on __aexit__. Tests themselves pass — this only affects cleanup.
        pass
    finally:
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def game_theme(test_db: AsyncSession) -> MapTheme:
    """A MapTheme for game tests."""
    theme = MapTheme(
        id=uuid.uuid4(),
        code="test_beach",
        name="Beach",
        scene_url_small="https://cdn.test/themes/beach/scene_small.glb",
        scene_url_medium="https://cdn.test/themes/beach/scene_medium.glb",
        scene_url_large="https://cdn.test/themes/beach/scene_large.glb",
        piece_model_url="https://cdn.test/themes/beach/piece.glb",
        color_textures={
            "GREEN": "https://cdn.test/themes/beach/colors/green.webp",
            "BLUE": "https://cdn.test/themes/beach/colors/blue.webp",
        },
    )
    test_db.add(theme)
    await test_db.flush()
    return theme


@pytest_asyncio.fixture
async def game_map(test_db: AsyncSession, test_user: User, game_theme: MapTheme) -> Map:
    """Active map with one field and a card pack — required for create_room."""
    card_type = CardType(
        id=uuid.uuid4(),
        code="game_test_alias",
        name="Alias",
        description="Classic alias",
        core_mechanic=CardMechanicEnum.CLASSIC_ALIAS.value,
        allowed_modifiers=[],
        schema={"type": "object", "properties": {"word": {"type": "string"}}, "required": ["word"]},
    )
    test_db.add(card_type)

    pack = CardPack(
        id=uuid.uuid4(),
        name="Game Pack",
        description="Pack for game",
        is_public=True,
        type_id=card_type.id,
        author_id=test_user.id,
        status=StatusEnum.ACTIVE.value,
    )
    test_db.add(pack)

    map_obj = Map(
        id=uuid.uuid4(),
        name="Game Map",
        is_public=True,
        size="MEDIUM",
        max_fields_count=48,
        author_id=test_user.id,
        status=StatusEnum.ACTIVE.value,
    )
    test_db.add(map_obj)
    await test_db.flush()

    field = MapFieldORM(
        id=uuid.uuid4(),
        position_index=0,
        time_limit=60,
        award=1,
        penalty=1,
        map_id=map_obj.id,
        card_pack_id=pack.id,
    )
    test_db.add(field)
    await test_db.flush()

    return map_obj
