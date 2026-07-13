import asyncio
import time
import uuid
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.messages import ErrorMessage
from app.models.card import Card
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import (
    CardStatus,
    RoomStateJSON,
    RoomStatus,
    RoundCard,
    TurnPhase,
)
from app.services import game_state as gs
from app.services import game_timer as timer
from app.ws.connection_manager import ConnectionManager
from app.ws.events import ServerEvent

logger = logging.getLogger(__name__)

# Pending disconnect grace tasks: (room_code, player_id) → asyncio.Task
_disconnect_tasks: dict[tuple[str, uuid.UUID], asyncio.Task] = {}


class GameService:
    def __init__(
        self,
        game_repo: GameRepository,
        conn_manager: ConnectionManager,
        db: AsyncSession,
    ) -> None:
        self.game_repo = game_repo
        self.conn_manager = conn_manager
        self.db = db

    # ------------------------------------------------------------------
    # Private I/O helpers
    # ------------------------------------------------------------------

    async def _get_playing_room(self, room_code: str) -> RoomStateJSON:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise BadRequestError(ErrorMessage.ROOM_NOT_FOUND)
        if room.status != RoomStatus.PLAYING:
            raise BadRequestError(ErrorMessage.GAME_NOT_PLAYING)
        return room

    async def _load_card_content(self, card_id: uuid.UUID) -> dict | None:
        result = await self.db.execute(select(Card.content).where(Card.id == card_id))
        return result.scalar_one_or_none()

    async def _deal_next_card(self, room: RoomStateJSON) -> tuple[uuid.UUID, dict] | None:
        """Pop cards from the queue until we find one whose content exists in DB."""
        while True:
            card_id = gs.pop_next_card_id(room)
            if card_id is None:
                return None
            content = await self._load_card_content(card_id)
            if content is not None:
                return card_id, content
            logger.warning("Card %s not found in DB, skipping", card_id)

    # ------------------------------------------------------------------
    # Timer callback
    # ------------------------------------------------------------------

    async def _on_timer_expired(self, room_code: str) -> None:
        """Called by game_timer when the guessing phase timer fires."""
        room = await self.game_repo.get_room(room_code)
        if room is None or room.status != RoomStatus.PLAYING:
            return
        turn = room.current_turn
        if turn is None or turn.phase != TurnPhase.GUESSING:
            return

        logger.info("Server timer: forcing REVIEW for room %s", room_code)
        await self._transition_to_review(room, room_code)

    # ------------------------------------------------------------------
    # READY — explainer starts the turn (PREPARE → GUESSING)
    # ------------------------------------------------------------------

    async def handle_ready(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        turn = gs.assert_explainer(room, player_id)
        gs.assert_phase(turn, TurnPhase.PREPARE)

        field = gs.get_current_field(room)
        turn.phase = TurnPhase.GUESSING
        turn.ends_at = time.time() + field.time_limit
        turn.round_cards = []

        result = await self._deal_next_card(room)
        if result is None:
            raise BadRequestError(ErrorMessage.GAME_NO_CARDS_LEFT)

        card_id, content = result
        turn.round_cards.append(RoundCard(card_id=card_id, content=content, status=CardStatus.UNPLAYED))

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn, remaining_seconds=field.time_limit))
        await self.conn_manager.send_to_player(room_code, player_id, ServerEvent.card_dealt(card_id, content))

        timer.schedule(room_code, field.time_limit, self._on_timer_expired)

    # ------------------------------------------------------------------
    # CARD_SWIPE — explainer marks card as guessed/failed
    # ------------------------------------------------------------------

    async def handle_card_swipe(
        self, room_code: str, player_id: uuid.UUID, status: CardStatus
    ) -> None:
        room = await self._get_playing_room(room_code)
        turn = gs.assert_explainer(room, player_id)
        gs.assert_phase(turn, TurnPhase.GUESSING)

        if time.time() > turn.ends_at:
            return

        if turn.round_cards:
            current_card = turn.round_cards[-1]
            if current_card.status == CardStatus.UNPLAYED:
                current_card.status = status
                await self.conn_manager.broadcast_except(
                    room_code, player_id,
                    ServerEvent.card_swiped(current_card.card_id, current_card.content, status),
                )

        result = await self._deal_next_card(room)
        if result is not None:
            card_id, content = result
            turn.round_cards.append(RoundCard(card_id=card_id, content=content, status=CardStatus.UNPLAYED))
            await self.game_repo.save_room(room)
            await self.conn_manager.send_to_player(room_code, player_id, ServerEvent.card_dealt(card_id, content))
        else:
            await self._transition_to_review(room, room_code)

    # ------------------------------------------------------------------
    # EDIT_CARD_STATUS — during REVIEW, explainer corrects card statuses
    # ------------------------------------------------------------------

    async def handle_edit_card_status(
        self, room_code: str, player_id: uuid.UUID, card_id: uuid.UUID, new_status: CardStatus
    ) -> None:
        room = await self._get_playing_room(room_code)
        turn = gs.assert_explainer(room, player_id)
        gs.assert_phase(turn, TurnPhase.REVIEW)

        if new_status == CardStatus.UNPLAYED:
            raise BadRequestError(ErrorMessage.GAME_INVALID_CARD_STATUS)

        for card in turn.round_cards:
            if card.card_id == card_id:
                card.status = new_status
                break
        else:
            raise BadRequestError(ErrorMessage.GAME_CARD_NOT_IN_ROUND)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))

    # ------------------------------------------------------------------
    # CONFIRM_RESULTS — finalize round, update score, check win, rotate
    # ------------------------------------------------------------------

    async def handle_confirm_results(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        turn = room.current_turn
        if turn is None:
            raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)

        if player_id != turn.explainer_id and player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.GAME_NOT_EXPLAINER)
        gs.assert_phase(turn, TurnPhase.REVIEW)

        await self._confirm_and_rotate(room, room_code)

    # ------------------------------------------------------------------
    # ADJUST_SCORE — host manually changes team position
    # ------------------------------------------------------------------

    async def handle_adjust_score(
        self, room_code: str, player_id: uuid.UUID, team_id: uuid.UUID, delta: int
    ) -> None:
        room = await self._get_playing_room(room_code)
        if player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        team = room.teams.get(team_id)
        if team is None:
            raise BadRequestError(ErrorMessage.ROOM_TEAM_NOT_FOUND)

        gs.clamp_team_position(room, team, delta)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.score_updated(team_id, team.current_position))

        if team.current_position >= room.map_info.max_fields_count:
            await self._finish_game(room, room_code, team_id)

    # ------------------------------------------------------------------
    # RESTART_TURN — host restarts the current turn
    # ------------------------------------------------------------------

    async def handle_restart_turn(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        if player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        timer.cancel(room_code)
        turn = room.current_turn
        if turn is None:
            raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)

        gs.return_cards_to_queue(room)

        turn.phase = TurnPhase.PREPARE
        turn.ends_at = 0.0
        turn.round_cards = []

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))

    # ------------------------------------------------------------------
    # END_GAME — host ends the game early
    # ------------------------------------------------------------------

    async def handle_end_game(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        if player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        winner_team_id = gs.determine_winner(room)
        await self._finish_game(room, room_code, winner_team_id)

    # ------------------------------------------------------------------
    # KICK_PLAYER — host removes a player from the game
    # ------------------------------------------------------------------

    async def handle_kick_player(self, room_code: str, host_id: uuid.UUID, target_player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        if host_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)
        if target_player_id == host_id:
            raise BadRequestError(ErrorMessage.GAME_CANNOT_KICK_SELF)
        if target_player_id not in room.players:
            raise BadRequestError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        await self._remove_player_from_game(room, room_code, target_player_id, kicked=True)

    # ------------------------------------------------------------------
    # MOVE_PLAYER — host moves a player to another team
    # ------------------------------------------------------------------

    async def handle_move_player(
        self, room_code: str, host_id: uuid.UUID, target_player_id: uuid.UUID, target_team_id: uuid.UUID
    ) -> None:
        room = await self._get_playing_room(room_code)
        if host_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)
        if target_player_id not in room.players:
            raise BadRequestError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        target_team = room.teams.get(target_team_id)
        if target_team is None:
            raise BadRequestError(ErrorMessage.GAME_TARGET_TEAM_NOT_FOUND)

        player = room.players[target_player_id]
        old_team_id = player.team_id
        if old_team_id == target_team_id:
            return

        turn = room.current_turn
        was_explainer = turn is not None and turn.explainer_id == target_player_id

        gs.remove_player_from_team(room, target_player_id)
        player.team_id = target_team_id
        target_team.player_ids.append(target_player_id)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code, ServerEvent.player_team_changed(target_player_id, old_team_id, target_team_id)
        )

        if was_explainer:
            await self._handle_explainer_removed(room, room_code)

    # ------------------------------------------------------------------
    # REORDER_TEAMS — host changes the turn order of teams
    # ------------------------------------------------------------------

    async def handle_reorder_teams(self, room_code: str, host_id: uuid.UUID, team_ids: list[uuid.UUID]) -> None:
        room = await self._get_playing_room(room_code)
        if host_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        if set(team_ids) != set(room.teams.keys()) or len(team_ids) != len(room.teams):
            raise BadRequestError(ErrorMessage.GAME_INVALID_TEAM_ORDER)

        room.teams = {tid: room.teams[tid] for tid in team_ids}
        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.teams_reordered(team_ids))

    # ------------------------------------------------------------------
    # LEAVE_GAME — player voluntarily leaves during a game
    # ------------------------------------------------------------------

    async def handle_leave_game(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        if player_id not in room.players:
            raise BadRequestError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)
        if player_id == room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_HOST_CANNOT_LEAVE)

        await self._remove_player_from_game(room, room_code, player_id, kicked=False)

    # ------------------------------------------------------------------
    # Disconnect grace period
    # ------------------------------------------------------------------

    @staticmethod
    def cancel_pending_disconnect(room_code: str, player_id: uuid.UUID) -> None:
        """Cancel a pending disconnect grace task (e.g. on reconnect)."""
        key = (room_code, player_id)
        task = _disconnect_tasks.pop(key, None)
        if task is not None and not task.done():
            task.cancel()

    @staticmethod
    def schedule_disconnect(room_code: str, player_id: uuid.UUID) -> None:
        """Schedule a delayed disconnect handler with fresh dependencies."""
        key = (room_code, player_id)
        task = asyncio.create_task(_delayed_disconnect(room_code, player_id))
        _disconnect_tasks[key] = task

    # ------------------------------------------------------------------
    # RECONNECT — player comes back, resume if paused
    # ------------------------------------------------------------------

    async def handle_player_reconnect(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self.game_repo.get_room(room_code)
        if room is None or room.status != RoomStatus.PLAYING:
            return
        if room.current_turn is not None:
            return

        player = room.players.get(player_id)
        if player is None or player.team_id is None:
            return

        team_ids = list(room.teams.keys())
        try:
            start_idx = team_ids.index(player.team_id)
        except ValueError:
            return

        for i in range(len(team_ids)):
            idx = (start_idx + i) % len(team_ids)
            candidate_team_id = team_ids[idx]
            candidate_team = room.teams[candidate_team_id]

            explainer_id = gs.find_online_explainer(room, candidate_team)
            if explainer_id is not None:
                new_turn = gs.make_prepare_turn(
                    candidate_team_id, explainer_id, candidate_team.explainer_index,
                )
                room.current_turn = new_turn
                await self.game_repo.save_room(room)
                await self.conn_manager.broadcast(room_code, ServerEvent.turn_started(new_turn))
                return

    # ------------------------------------------------------------------
    # DISCONNECT — player disconnects (called after grace period)
    # ------------------------------------------------------------------

    async def handle_explainer_disconnect(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self.game_repo.get_room(room_code)
        if room is None or room.status != RoomStatus.PLAYING:
            return
        turn = room.current_turn
        if turn is None or turn.explainer_id != player_id:
            return

        await self._handle_explainer_removed(room, room_code)

    # ------------------------------------------------------------------
    # Internal: remove player from a running game
    # ------------------------------------------------------------------

    async def _remove_player_from_game(
        self, room: RoomStateJSON, room_code: str, player_id: uuid.UUID, kicked: bool
    ) -> None:
        turn = room.current_turn
        was_explainer = turn is not None and turn.explainer_id == player_id

        gs.remove_player_from_team(room, player_id)
        room.players.pop(player_id, None)

        await self.game_repo.save_room(room)

        event = ServerEvent.player_kicked(player_id) if kicked else ServerEvent.player_left(player_id)
        await self.conn_manager.broadcast(room_code, event)

        if was_explainer:
            await self._handle_explainer_removed(room, room_code)

    async def _handle_explainer_removed(self, room: RoomStateJSON, room_code: str) -> None:
        """Handle explainer left/kicked/disconnected/moved.

        PREPARE  → try to reassign within the same team, otherwise rotate.
        GUESSING → review → auto-confirm → rotate.
        REVIEW   → auto-confirm → rotate.
        """
        turn = room.current_turn
        if turn is None:
            return

        if turn.phase == TurnPhase.PREPARE:
            team = room.teams.get(turn.team_id)
            if team is not None:
                new_explainer_id = gs.find_online_explainer(room, team)
                if new_explainer_id is not None:
                    new_turn = gs.make_prepare_turn(
                        turn.team_id, new_explainer_id, team.explainer_index,
                    )
                    room.current_turn = new_turn
                    await self.game_repo.save_room(room)
                    await self.conn_manager.broadcast(room_code, ServerEvent.turn_started(new_turn))
                    return
            await self._rotate_turn(room, room_code)
        elif turn.phase == TurnPhase.GUESSING:
            await self._transition_to_review(room, room_code)
            await self._confirm_and_rotate(room, room_code)
        elif turn.phase == TurnPhase.REVIEW:
            await self._confirm_and_rotate(room, room_code)

    # ------------------------------------------------------------------
    # Internal transitions
    # ------------------------------------------------------------------

    async def _transition_to_review(self, room: RoomStateJSON, room_code: str) -> None:
        timer.cancel(room_code)
        turn = room.current_turn
        if turn is None:
            return
        turn.phase = TurnPhase.REVIEW
        turn.ends_at = 0.0

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))

    async def _confirm_and_rotate(self, room: RoomStateJSON, room_code: str) -> None:
        turn = room.current_turn
        if turn is None:
            return

        score_delta = gs.calculate_score_and_return_cards(room)
        team = room.teams[turn.team_id]

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code,
            ServerEvent.round_results(turn.team_id, turn.round_cards, score_delta, team.current_position),
        )

        if team.current_position >= room.map_info.max_fields_count:
            await self._finish_game(room, room_code, turn.team_id)
            return

        await self._rotate_turn(room, room_code)

    async def _rotate_turn(self, room: RoomStateJSON, room_code: str) -> None:
        turn = room.current_turn
        if turn is None:
            return

        finished_team = room.teams[turn.team_id]
        if finished_team.player_ids:
            finished_team.explainer_index = (turn.explainer_index + 1) % len(finished_team.player_ids)

        team_ids = list(room.teams.keys())
        current_team_idx = team_ids.index(turn.team_id)
        num_teams = len(team_ids)

        for i in range(1, num_teams + 1):
            next_team_idx = (current_team_idx + i) % num_teams
            next_team_id = team_ids[next_team_idx]
            next_team = room.teams[next_team_id]

            next_explainer_id = gs.find_online_explainer(room, next_team)
            if next_explainer_id is not None:
                new_turn = gs.make_prepare_turn(
                    next_team_id, next_explainer_id, next_team.explainer_index,
                )
                room.current_turn = new_turn
                await self.game_repo.save_room(room)
                await self.conn_manager.broadcast(room_code, ServerEvent.turn_started(new_turn))
                return

        room.current_turn = None
        await self.game_repo.save_room(room)

    async def _finish_game(
        self, room: RoomStateJSON, room_code: str, winner_team_id: uuid.UUID | None
    ) -> None:
        timer.cancel(room_code)
        room.status = RoomStatus.FINISHED
        room.current_turn = None

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.game_finished(winner_team_id, room.teams))

        await self._persist_game_stats(room, winner_team_id)

    async def _persist_game_stats(
        self, room: RoomStateJSON, winner_team_id: uuid.UUID | None
    ) -> None:
        all_player_ids = list(room.players.keys())

        if all_player_ids:
            await self.db.execute(
                update(User)
                .where(User.id.in_(all_player_ids), User.deleted_at.is_(None))
                .values(games_played=User.games_played + 1)
            )

        if winner_team_id is not None:
            winner_player_ids = set(room.teams[winner_team_id].player_ids)
            if winner_player_ids:
                await self.db.execute(
                    update(User)
                    .where(User.id.in_(winner_player_ids), User.deleted_at.is_(None))
                    .values(games_won=User.games_won + 1)
                )

        await self.db.commit()


# ------------------------------------------------------------------
# Module-level coroutine for delayed disconnect (used by schedule_disconnect)
# ------------------------------------------------------------------

async def _delayed_disconnect(room_code: str, player_id: uuid.UUID) -> None:
    """Wait for grace period, then handle disconnect with fresh dependencies."""
    try:
        await asyncio.sleep(settings.WS_DISCONNECT_GRACE_SECONDS)
    except asyncio.CancelledError:
        return

    _disconnect_tasks.pop((room_code, player_id), None)

    from app.db.session import AsyncSessionLocal
    from app.db.redis import _client as redis_client
    from app.ws.connection_manager import manager

    redis = redis_client
    if redis is None:
        return

    async with AsyncSessionLocal() as db:
        repo = GameRepository(redis)
        svc = GameService(game_repo=repo, conn_manager=manager, db=db)
        await svc.handle_explainer_disconnect(room_code, player_id)


