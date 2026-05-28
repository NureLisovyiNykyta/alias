"""Tests for GameService — the core game logic."""

import time
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fakeredis import FakeAsyncRedis

from app.core.exceptions import BadRequestError, ForbiddenError
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import (
    CardPackInfo,
    CardStatus,
    CurrentTurn,
    MapField,
    MapInfo,
    Player,
    RoomStateJSON,
    RoomStatus,
    RoundCard,
    Settings,
    Team,
    TeamColor,
    ThemeInfo,
    TurnPhase,
)
from app.services.game import GameService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pack_id() -> uuid.UUID:
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


def _card_ids(n: int = 5) -> list[uuid.UUID]:
    return [uuid.uuid4() for _ in range(n)]


def build_playing_room(
    host_id: uuid.UUID,
    team1_players: list[uuid.UUID],
    team2_players: list[uuid.UUID],
    *,
    max_fields: int = 10,
    card_queue: list[uuid.UUID] | None = None,
    room_code: str = "GAME01",
) -> RoomStateJSON:
    """Build a room in PLAYING status with 2 teams and a current turn on team1."""
    pack_id = _pack_id()
    team1_id, team2_id = uuid.uuid4(), uuid.uuid4()

    players: dict[uuid.UUID, Player] = {}
    for pid in team1_players:
        players[pid] = Player(user_id=pid, nickname=f"p-{pid.hex[:4]}", is_online=True, team_id=team1_id)
    for pid in team2_players:
        players[pid] = Player(user_id=pid, nickname=f"p-{pid.hex[:4]}", is_online=True, team_id=team2_id)

    teams = {
        team1_id: Team(team_id=team1_id, name="Alpha", color=TeamColor.GREEN,
                       current_position=0, player_ids=team1_players),
        team2_id: Team(team_id=team2_id, name="Beta", color=TeamColor.BLUE,
                       current_position=0, player_ids=team2_players),
    }

    current_turn = CurrentTurn(
        team_id=team1_id,
        explainer_id=team1_players[0],
        explainer_index=0,
        phase=TurnPhase.PREPARE,
        ends_at=0.0,
        round_cards=[],
    )

    return RoomStateJSON(
        room_code=room_code,
        name="Game Room",
        host_id=host_id,
        status=RoomStatus.PLAYING,
        settings=Settings(),
        map_info=MapInfo(
            map_id=uuid.uuid4(),
            name="Test Map",
            max_fields_count=max_fields,
            fields={
                i: MapField(position_index=i, time_limit=60, award=1, penalty=1, card_pack_id=pack_id)
                for i in range(max_fields)
            },
        ),
        theme_info=ThemeInfo(
            theme_id=uuid.uuid4(), code="test", name="Test",
            scene_url="", piece_model_url="", color_textures={},
        ),
        teams=teams,
        players=players,
        card_packs_info={
            pack_id: CardPackInfo(card_pack_id=pack_id, name="Pack", core_mechanic="alias", description="d")
        },
        card_queues={pack_id: _card_ids(20) if card_queue is None else card_queue},
        current_turn=current_turn,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def redis_client() -> FakeAsyncRedis:
    async with FakeAsyncRedis(decode_responses=True) as client:
        yield client


@pytest.fixture
def game_repo(redis_client: FakeAsyncRedis) -> GameRepository:
    return GameRepository(redis_client)


@pytest.fixture
def conn_manager() -> AsyncMock:
    cm = AsyncMock()
    cm.broadcast = AsyncMock()
    cm.send_to_player = AsyncMock()
    cm.send_personal = AsyncMock()
    return cm


@pytest.fixture
def mock_db() -> AsyncMock:
    """Mock AsyncSession — _load_card_content returns content from it."""
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = {"word": "TestWord"}
    db.execute = AsyncMock(return_value=result_mock)
    db.commit = AsyncMock()
    return db


@pytest.fixture
def ids():
    """Convenience fixture: 4 player UUIDs + host = players[0]."""
    p = [uuid.uuid4() for _ in range(4)]
    return p


@pytest_asyncio.fixture
async def service_and_room(game_repo, conn_manager, mock_db, ids):
    """Create a GameService + a ready-to-play room.
    Returns (service, room, team1_id, team2_id).
    """
    cards = _card_ids(20)
    room = build_playing_room(
        host_id=ids[0],
        team1_players=[ids[0], ids[1]],
        team2_players=[ids[2], ids[3]],
        card_queue=cards,
    )
    await game_repo.save_room(room)
    service = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)
    team_ids = list(room.teams.keys())
    return service, room, team_ids[0], team_ids[1]


# ---------------------------------------------------------------------------
# Tests: handle_ready
# ---------------------------------------------------------------------------

class TestHandleReady:
    async def test_ready_transitions_to_guessing(self, service_and_room, game_repo):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        await svc.handle_ready(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.phase == TurnPhase.GUESSING
        assert stored.current_turn.ends_at > time.time()
        assert len(stored.current_turn.round_cards) == 1
        assert stored.current_turn.round_cards[0].status == CardStatus.UNPLAYED

    async def test_ready_broadcasts_phase_changed_and_card_dealt(self, service_and_room, conn_manager):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        await svc.handle_ready(room.room_code, explainer_id)

        conn_manager.broadcast.assert_called_once()
        event = conn_manager.broadcast.call_args[0][1]
        assert event.type.value == "phase_changed"

        conn_manager.send_to_player.assert_called_once()
        card_event = conn_manager.send_to_player.call_args[0][2]
        assert card_event.type.value == "card_dealt"

    async def test_ready_by_non_explainer_raises(self, service_and_room, ids):
        svc, room, t1, t2 = service_and_room
        non_explainer = ids[1]  # second player

        with pytest.raises(ForbiddenError):
            await svc.handle_ready(room.room_code, non_explainer)

    async def test_ready_wrong_phase_raises(self, service_and_room, game_repo, ids):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        # Set phase to GUESSING
        room.current_turn.phase = TurnPhase.GUESSING
        room.current_turn.ends_at = time.time() + 60
        await game_repo.save_room(room)

        with pytest.raises(BadRequestError):
            await svc.handle_ready(room.room_code, explainer_id)

    async def test_ready_no_cards_raises(self, game_repo, conn_manager, mock_db, ids):
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=[],  # empty queue
        )
        await game_repo.save_room(room)
        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)

        with pytest.raises(BadRequestError):
            await svc.handle_ready(room.room_code, ids[0])


# ---------------------------------------------------------------------------
# Tests: handle_card_swipe
# ---------------------------------------------------------------------------

class TestHandleCardSwipe:
    async def _make_guessing(self, svc, room, game_repo):
        """Move the room to GUESSING phase."""
        explainer_id = room.current_turn.explainer_id
        await svc.handle_ready(room.room_code, explainer_id)
        return await game_repo.get_room(room.room_code)

    async def test_swipe_guessed_updates_card_and_deals_next(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._make_guessing(svc, room, game_repo)
        conn_manager.reset_mock()

        explainer_id = room.current_turn.explainer_id
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.round_cards[0].status == CardStatus.GUESSED
        assert len(stored.current_turn.round_cards) == 2  # old + new
        assert stored.current_turn.round_cards[1].status == CardStatus.UNPLAYED

        conn_manager.send_to_player.assert_called_once()

    async def test_swipe_failed_updates_card(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._make_guessing(svc, room, game_repo)
        conn_manager.reset_mock()

        explainer_id = room.current_turn.explainer_id
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.FAILED)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.round_cards[0].status == CardStatus.FAILED

    async def test_swipe_after_timer_transitions_to_review(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._make_guessing(svc, room, game_repo)

        # Force timer to be expired
        room.current_turn.ends_at = time.time() - 10
        await game_repo.save_room(room)
        conn_manager.reset_mock()

        explainer_id = room.current_turn.explainer_id
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.phase == TurnPhase.REVIEW

    async def test_swipe_no_more_cards_transitions_to_review(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(1)  # only 1 card
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=cards,
        )
        await game_repo.save_room(room)
        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)

        # Start turn
        await svc.handle_ready(room.room_code, ids[0])
        conn_manager.reset_mock()

        # Swipe the only card — no more cards left
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.phase == TurnPhase.REVIEW

    async def test_swipe_by_non_explainer_raises(self, service_and_room, game_repo, ids):
        svc, room, t1, t2 = service_and_room
        await self._make_guessing(svc, room, game_repo)

        with pytest.raises(ForbiddenError):
            await svc.handle_card_swipe(room.room_code, ids[1], CardStatus.GUESSED)


# ---------------------------------------------------------------------------
# Tests: handle_timer_expired
# ---------------------------------------------------------------------------

class TestHandleTimerExpired:
    async def test_timer_expired_transitions_to_review(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        await svc.handle_ready(room.room_code, explainer_id)
        conn_manager.reset_mock()

        await svc.handle_timer_expired(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.phase == TurnPhase.REVIEW
        assert stored.current_turn.ends_at == 0.0

        conn_manager.broadcast.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: handle_edit_card_status
# ---------------------------------------------------------------------------

class TestHandleEditCardStatus:
    async def _setup_review(self, svc, room, game_repo, conn_manager):
        explainer_id = room.current_turn.explainer_id
        await svc.handle_ready(room.room_code, explainer_id)
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, explainer_id)
        conn_manager.reset_mock()
        return await game_repo.get_room(room.room_code)

    async def test_edit_card_status_changes_status(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review(svc, room, game_repo, conn_manager)

        explainer_id = room.current_turn.explainer_id
        # First card was GUESSED, change it to FAILED
        card_id = room.current_turn.round_cards[0].card_id
        await svc.handle_edit_card_status(room.room_code, explainer_id, card_id, CardStatus.FAILED)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.round_cards[0].status == CardStatus.FAILED
        conn_manager.broadcast.assert_called_once()

    async def test_edit_card_to_unplayed_raises(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review(svc, room, game_repo, conn_manager)
        explainer_id = room.current_turn.explainer_id
        card_id = room.current_turn.round_cards[0].card_id

        with pytest.raises(BadRequestError):
            await svc.handle_edit_card_status(room.room_code, explainer_id, card_id, CardStatus.UNPLAYED)

    async def test_edit_nonexistent_card_raises(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review(svc, room, game_repo, conn_manager)
        explainer_id = room.current_turn.explainer_id

        with pytest.raises(BadRequestError):
            await svc.handle_edit_card_status(room.room_code, explainer_id, uuid.uuid4(), CardStatus.GUESSED)

    async def test_edit_wrong_phase_raises(self, service_and_room, ids):
        svc, room, t1, t2 = service_and_room
        # Phase is PREPARE, not REVIEW
        with pytest.raises(BadRequestError):
            await svc.handle_edit_card_status(room.room_code, ids[0], uuid.uuid4(), CardStatus.GUESSED)


# ---------------------------------------------------------------------------
# Tests: handle_confirm_results
# ---------------------------------------------------------------------------

class TestHandleConfirmResults:
    async def _setup_review_with_cards(self, svc, room, game_repo, conn_manager, n_guessed=2, n_failed=1):
        explainer_id = room.current_turn.explainer_id
        await svc.handle_ready(room.room_code, explainer_id)

        for _ in range(n_guessed):
            await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        for _ in range(n_failed):
            await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.FAILED)

        await svc.handle_timer_expired(room.room_code, explainer_id)
        conn_manager.reset_mock()
        return await game_repo.get_room(room.room_code)

    async def test_confirm_updates_score_and_rotates(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review_with_cards(svc, room, game_repo, conn_manager, n_guessed=3, n_failed=1)

        explainer_id = room.current_turn.explainer_id
        await svc.handle_confirm_results(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        # Score: 3*1 - 1*1 = 2
        team1 = stored.teams[t1]
        assert team1.current_position == 2

        # Turn rotated to team2
        assert stored.current_turn.team_id == t2
        assert stored.current_turn.phase == TurnPhase.PREPARE

    async def test_confirm_by_host_allowed(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review_with_cards(svc, room, game_repo, conn_manager)

        # ids[0] is both host and explainer, test with host_id
        await svc.handle_confirm_results(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.team_id == t2

    async def test_confirm_by_non_host_non_explainer_raises(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room
        room = await self._setup_review_with_cards(svc, room, game_repo, conn_manager)

        with pytest.raises(ForbiddenError):
            await svc.handle_confirm_results(room.room_code, ids[2])

    async def test_confirm_returns_all_cards_to_queue(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        await svc.handle_ready(room.room_code, explainer_id)
        # Swipe 1 card as GUESSED, then timer expires — last card stays UNPLAYED
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, explainer_id)

        room = await game_repo.get_room(room.room_code)
        round_card_ids = [c.card_id for c in room.current_turn.round_cards]
        queue_before = len(room.card_queues[_pack_id()])
        conn_manager.reset_mock()

        await svc.handle_confirm_results(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        queue_after = stored.card_queues[_pack_id()]
        # ALL cards (GUESSED + UNPLAYED) should be returned to the end of the queue
        for card_id in round_card_ids:
            assert card_id in queue_after

    async def test_confirm_triggers_win(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(20)
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            max_fields=3,  # very small map
            card_queue=cards,
        )
        await game_repo.save_room(room)
        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)

        explainer_id = ids[0]
        await svc.handle_ready(room.room_code, explainer_id)
        # 3 guessed → score = 3, position = 3 >= max_fields(3) → WIN
        for _ in range(3):
            await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, explainer_id)
        conn_manager.reset_mock()

        await svc.handle_confirm_results(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        assert stored.status == RoomStatus.FINISHED
        assert stored.current_turn is None

        # Check GAME_FINISHED was broadcast
        calls = [c[0][1] for c in conn_manager.broadcast.call_args_list]
        finished_events = [e for e in calls if e.type.value == "game_finished"]
        assert len(finished_events) == 1

    async def test_score_cannot_go_below_zero(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        await svc.handle_ready(room.room_code, explainer_id)
        # Only fail cards → score negative, but position clamped to 0
        for _ in range(5):
            await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.FAILED)
        await svc.handle_timer_expired(room.room_code, explainer_id)
        conn_manager.reset_mock()

        await svc.handle_confirm_results(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        assert stored.teams[t1].current_position == 0


# ---------------------------------------------------------------------------
# Tests: handle_adjust_score
# ---------------------------------------------------------------------------

class TestHandleAdjustScore:
    async def test_adjust_score_positive(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_adjust_score(room.room_code, ids[0], t1, 5)

        stored = await game_repo.get_room(room.room_code)
        assert stored.teams[t1].current_position == 5
        conn_manager.broadcast.assert_called_once()

    async def test_adjust_score_negative_clamps_to_zero(self, service_and_room, game_repo, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_adjust_score(room.room_code, ids[0], t1, -10)

        stored = await game_repo.get_room(room.room_code)
        assert stored.teams[t1].current_position == 0

    async def test_adjust_score_non_host_raises(self, service_and_room, ids):
        svc, room, t1, t2 = service_and_room

        with pytest.raises(ForbiddenError):
            await svc.handle_adjust_score(room.room_code, ids[2], t1, 5)

    async def test_adjust_score_unknown_team_raises(self, service_and_room, ids):
        svc, room, t1, t2 = service_and_room

        with pytest.raises(BadRequestError):
            await svc.handle_adjust_score(room.room_code, ids[0], uuid.uuid4(), 5)

    async def test_adjust_score_triggers_win(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_adjust_score(room.room_code, ids[0], t1, 10)  # == max_fields

        stored = await game_repo.get_room(room.room_code)
        assert stored.status == RoomStatus.FINISHED


# ---------------------------------------------------------------------------
# Tests: handle_restart_turn
# ---------------------------------------------------------------------------

class TestHandleRestartTurn:
    async def test_restart_resets_to_prepare(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        # Move to GUESSING first
        await svc.handle_ready(room.room_code, ids[0])
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)
        conn_manager.reset_mock()

        await svc.handle_restart_turn(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.phase == TurnPhase.PREPARE
        assert stored.current_turn.round_cards == []
        assert stored.current_turn.ends_at == 0.0

    async def test_restart_returns_cards_to_queue(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room
        queue_before = len(room.card_queues[_pack_id()])

        await svc.handle_ready(room.room_code, ids[0])
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)
        # 2 cards dealt (ready + swipe), popped from queue

        room_mid = await game_repo.get_room(room.room_code)
        cards_in_round = len(room_mid.current_turn.round_cards)

        await svc.handle_restart_turn(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        # Cards should be returned to queue
        queue_after = len(stored.card_queues[_pack_id()])
        assert queue_after == queue_before - cards_in_round + cards_in_round  # popped then returned

    async def test_restart_non_host_raises(self, service_and_room, ids):
        svc, room, t1, t2 = service_and_room

        with pytest.raises(ForbiddenError):
            await svc.handle_restart_turn(room.room_code, ids[2])


# ---------------------------------------------------------------------------
# Tests: _rotate_turn
# ---------------------------------------------------------------------------

class TestRotateTurn:
    async def test_rotation_goes_to_next_team(self, service_and_room, game_repo, conn_manager):
        svc, room, t1, t2 = service_and_room
        explainer_id = room.current_turn.explainer_id

        # Play a full round: ready → swipe → timer → confirm
        await svc.handle_ready(room.room_code, explainer_id)
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, explainer_id)
        await svc.handle_confirm_results(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.team_id == t2
        assert stored.current_turn.phase == TurnPhase.PREPARE

    async def test_explainer_rotates_within_team(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        # Play 2 full rounds so team1 gets 2 turns
        for _ in range(2):
            stored = await game_repo.get_room(room.room_code)
            exp_id = stored.current_turn.explainer_id
            await svc.handle_ready(room.room_code, exp_id)
            await svc.handle_card_swipe(room.room_code, exp_id, CardStatus.GUESSED)
            await svc.handle_timer_expired(room.room_code, exp_id)
            await svc.handle_confirm_results(room.room_code, exp_id)

        # After 2 rounds (team1 → team2 → team1), team1's explainer should be ids[1]
        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.team_id == t1
        assert stored.current_turn.explainer_id == ids[1]

    async def test_rotation_skips_offline_team(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        # Make team2 all offline
        for pid in room.teams[t2].player_ids:
            room.players[pid].is_online = False
        await game_repo.save_room(room)

        # Play a round
        explainer_id = ids[0]
        await svc.handle_ready(room.room_code, explainer_id)
        await svc.handle_card_swipe(room.room_code, explainer_id, CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, explainer_id)
        await svc.handle_confirm_results(room.room_code, explainer_id)

        # Should skip team2 and come back to team1
        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.team_id == t1

    async def test_rotation_pauses_when_all_offline(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(20)
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=cards,
        )
        # Make everyone offline except current explainer (needed to play the round)
        for pid in [ids[1], ids[2], ids[3]]:
            room.players[pid].is_online = False
        await game_repo.save_room(room)
        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)

        await svc.handle_ready(room.room_code, ids[0])
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, ids[0])

        # Now make current explainer offline too
        r = await game_repo.get_room(room.room_code)
        r.players[ids[0]].is_online = False
        await game_repo.save_room(r)

        await svc.handle_confirm_results(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        # All offline → paused
        assert stored.current_turn is None
        assert stored.status == RoomStatus.PLAYING


# ---------------------------------------------------------------------------
# Tests: handle_explainer_disconnect
# ---------------------------------------------------------------------------

class TestHandleExplainerDisconnect:
    async def test_disconnect_during_prepare_rotates_turn(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room
        explainer_id = ids[0]

        await svc.handle_explainer_disconnect(room.room_code, explainer_id)

        stored = await game_repo.get_room(room.room_code)
        # Should rotate to team2
        assert stored.current_turn.team_id == t2

    async def test_disconnect_during_guessing_auto_confirms(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_ready(room.room_code, ids[0])
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)
        conn_manager.reset_mock()

        await svc.handle_explainer_disconnect(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        # Should have auto-confirmed and rotated to team2
        assert stored.current_turn.team_id == t2
        # Score should reflect the guessed card
        assert stored.teams[t1].current_position == 1

    async def test_disconnect_during_review_auto_confirms(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_ready(room.room_code, ids[0])
        await svc.handle_card_swipe(room.room_code, ids[0], CardStatus.GUESSED)
        await svc.handle_timer_expired(room.room_code, ids[0])
        conn_manager.reset_mock()

        await svc.handle_explainer_disconnect(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn.team_id == t2
        assert stored.teams[t1].current_position == 1

    async def test_disconnect_non_explainer_does_nothing(self, service_and_room, game_repo, ids):
        svc, room, t1, t2 = service_and_room

        await svc.handle_explainer_disconnect(room.room_code, ids[2])

        stored = await game_repo.get_room(room.room_code)
        # Nothing changed
        assert stored.current_turn.team_id == t1
        assert stored.current_turn.explainer_id == ids[0]

    async def test_disconnect_in_lobby_does_nothing(self, game_repo, conn_manager, mock_db, ids):
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
        )
        room.status = RoomStatus.LOBBY
        await game_repo.save_room(room)
        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)

        await svc.handle_explainer_disconnect(room.room_code, ids[0])
        # No crash, no changes
        stored = await game_repo.get_room(room.room_code)
        assert stored.status == RoomStatus.LOBBY


# ---------------------------------------------------------------------------
# Tests: _find_online_explainer
# ---------------------------------------------------------------------------

class TestFindOnlineExplainer:
    def _make_service(self) -> GameService:
        return GameService(
            game_repo=AsyncMock(),
            conn_manager=AsyncMock(),
            db=AsyncMock(),
        )

    def test_finds_first_online(self):
        svc = self._make_service()
        p1, p2, p3 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

        room = MagicMock()
        room.players = {
            p1: MagicMock(is_online=False),
            p2: MagicMock(is_online=True),
            p3: MagicMock(is_online=True),
        }

        team = Team(team_id=uuid.uuid4(), name="T", color=TeamColor.GREEN,
                    current_position=0, player_ids=[p1, p2, p3], explainer_index=0)

        result = svc._find_online_explainer(room, team)
        assert result == p2
        assert team.explainer_index == 1

    def test_wraps_around(self):
        svc = self._make_service()
        p1, p2, p3 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

        room = MagicMock()
        room.players = {
            p1: MagicMock(is_online=True),
            p2: MagicMock(is_online=False),
            p3: MagicMock(is_online=False),
        }

        team = Team(team_id=uuid.uuid4(), name="T", color=TeamColor.GREEN,
                    current_position=0, player_ids=[p1, p2, p3], explainer_index=1)

        result = svc._find_online_explainer(room, team)
        assert result == p1
        assert team.explainer_index == 0

    def test_all_offline_returns_none(self):
        svc = self._make_service()
        p1, p2 = uuid.uuid4(), uuid.uuid4()

        room = MagicMock()
        room.players = {
            p1: MagicMock(is_online=False),
            p2: MagicMock(is_online=False),
        }

        team = Team(team_id=uuid.uuid4(), name="T", color=TeamColor.GREEN,
                    current_position=0, player_ids=[p1, p2], explainer_index=0)

        result = svc._find_online_explainer(room, team)
        assert result is None

    def test_empty_team_returns_none(self):
        svc = self._make_service()
        room = MagicMock()

        team = Team(team_id=uuid.uuid4(), name="T", color=TeamColor.GREEN,
                    current_position=0, player_ids=[], explainer_index=0)

        result = svc._find_online_explainer(room, team)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: handle_player_reconnect
# ---------------------------------------------------------------------------

class TestHandlePlayerReconnect:
    async def test_reconnect_resumes_paused_game(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(20)
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=cards,
        )
        # Simulate paused state: PLAYING but current_turn = None, all offline
        room.current_turn = None
        for pid in ids:
            room.players[pid].is_online = False
        await game_repo.save_room(room)

        # Player reconnects → set online
        room.players[ids[0]].is_online = True
        await game_repo.save_room(room)

        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)
        await svc.handle_player_reconnect(room.room_code, ids[0])

        stored = await game_repo.get_room(room.room_code)
        assert stored.current_turn is not None
        assert stored.current_turn.phase == TurnPhase.PREPARE
        conn_manager.broadcast.assert_called_once()

    async def test_reconnect_does_nothing_if_game_not_paused(self, service_and_room, game_repo, conn_manager, ids):
        svc, room, t1, t2 = service_and_room
        conn_manager.reset_mock()

        # current_turn exists → not paused
        await svc.handle_player_reconnect(room.room_code, ids[0])

        conn_manager.broadcast.assert_not_called()

    async def test_reconnect_does_nothing_in_lobby(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(20)
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=cards,
        )
        room.status = RoomStatus.LOBBY
        room.current_turn = None
        await game_repo.save_room(room)

        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)
        await svc.handle_player_reconnect(room.room_code, ids[0])

        conn_manager.broadcast.assert_not_called()

    async def test_reconnect_picks_player_team_first(self, game_repo, conn_manager, mock_db, ids):
        cards = _card_ids(20)
        room = build_playing_room(
            host_id=ids[0],
            team1_players=[ids[0], ids[1]],
            team2_players=[ids[2], ids[3]],
            card_queue=cards,
        )
        room.current_turn = None
        for pid in ids:
            room.players[pid].is_online = False
        # Only ids[2] (team2) comes back online
        room.players[ids[2]].is_online = True
        await game_repo.save_room(room)

        svc = GameService(game_repo=game_repo, conn_manager=conn_manager, db=mock_db)
        await svc.handle_player_reconnect(room.room_code, ids[2])

        stored = await game_repo.get_room(room.room_code)
        t2 = room.players[ids[2]].team_id
        assert stored.current_turn is not None
        assert stored.current_turn.team_id == t2
        assert stored.current_turn.explainer_id == ids[2]


