import asyncio
import time
import uuid
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.messages import ErrorMessage
from app.models.card import Card
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import (
    CardStatus,
    CurrentTurn,
    MapField,
    RoomStateJSON,
    RoomStatus,
    RoundCard,
    Team,
    TurnPhase,
)
from app.ws.connection_manager import ConnectionManager
from app.ws.events import ServerEvent

logger = logging.getLogger(__name__)

# Active server-side timer tasks: room_code → asyncio.Task
_timer_tasks: dict[str, asyncio.Task] = {}


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
    # Helpers
    # ------------------------------------------------------------------

    async def _get_playing_room(self, room_code: str) -> RoomStateJSON:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise BadRequestError(ErrorMessage.ROOM_NOT_FOUND)
        if room.status != RoomStatus.PLAYING:
            raise BadRequestError(ErrorMessage.GAME_NOT_PLAYING)
        return room

    def _assert_explainer(self, room: RoomStateJSON, player_id: uuid.UUID) -> CurrentTurn:
        turn = room.current_turn
        assert turn is not None
        if turn.explainer_id != player_id:
            raise ForbiddenError(ErrorMessage.GAME_NOT_EXPLAINER)
        return turn

    def _assert_phase(self, turn: CurrentTurn, phase: TurnPhase) -> None:
        if turn.phase != phase:
            raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)

    def _get_current_field(self, room: RoomStateJSON) -> MapField:
        team = room.teams[room.current_turn.team_id]
        position = team.current_position
        return room.map_info.fields[position]

    def _find_online_explainer(self, room: RoomStateJSON, team: Team) -> uuid.UUID | None:
        """Find the next online player in the team starting from team.explainer_index.
        Returns player_id or None if no one is online."""
        player_ids = team.player_ids
        n = len(player_ids)
        if n == 0:
            return None
        for i in range(n):
            idx = (team.explainer_index + i) % n
            candidate_id = player_ids[idx]
            player = room.players.get(candidate_id)
            if player and player.is_online:
                team.explainer_index = idx
                return candidate_id
        return None

    async def _load_card_content(self, card_id: uuid.UUID) -> dict | None:
        result = await self.db.execute(select(Card.content).where(Card.id == card_id))
        return result.scalar_one_or_none()

    def _pop_next_card_id(self, room: RoomStateJSON) -> uuid.UUID | None:
        """Pop the next card from the queue for the current field's card pack."""
        field = self._get_current_field(room)
        queue = room.card_queues.get(field.card_pack_id, [])
        if not queue:
            return None
        return queue.pop(0)

    async def _deal_next_card(self, room: RoomStateJSON) -> tuple[uuid.UUID, dict] | None:
        """Pop cards from the queue until we find one whose content exists in DB.
        Returns (card_id, content) or None if the queue is empty."""
        while True:
            card_id = self._pop_next_card_id(room)
            if card_id is None:
                return None
            content = await self._load_card_content(card_id)
            if content is not None:
                return card_id, content
            # Card was deleted from DB — skip it, try next
            logger.warning("Card %s not found in DB, skipping", card_id)

    # ------------------------------------------------------------------
    # Server-side timer guard
    # ------------------------------------------------------------------

    def _schedule_timer(self, room_code: str, delay: float) -> None:
        """Schedule a background task that will force REVIEW after `delay` seconds
        if the client hasn't sent TIMER_EXPIRED by then."""
        self._cancel_timer(room_code)
        task = asyncio.create_task(self._timer_guard(room_code, delay))
        _timer_tasks[room_code] = task

    @staticmethod
    def _cancel_timer(room_code: str) -> None:
        task = _timer_tasks.pop(room_code, None)
        if task is not None and not task.done():
            task.cancel()

    async def _timer_guard(self, room_code: str, delay: float) -> None:
        """Background coroutine: sleep, then check if still in GUESSING and force REVIEW."""
        try:
            await asyncio.sleep(delay + 1)  # +1 sec grace for client latency
        except asyncio.CancelledError:
            return

        try:
            room = await self.game_repo.get_room(room_code)
            if room is None or room.status != RoomStatus.PLAYING:
                return
            turn = room.current_turn
            if turn is None or turn.phase != TurnPhase.GUESSING:
                return
            if time.time() <= turn.ends_at:
                return  # timer hasn't actually expired yet

            logger.info("Server timer guard: forcing REVIEW for room %s", room_code)
            await self._transition_to_review(room, room_code)
        except Exception:
            logger.exception("Timer guard error for room %s", room_code)
        finally:
            _timer_tasks.pop(room_code, None)

    # ------------------------------------------------------------------
    # READY — explainer starts the turn (PREPARE → GUESSING)
    # ------------------------------------------------------------------

    async def handle_ready(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        turn = self._assert_explainer(room, player_id)
        self._assert_phase(turn, TurnPhase.PREPARE)

        field = self._get_current_field(room)
        turn.phase = TurnPhase.GUESSING
        turn.ends_at = time.time() + field.time_limit
        turn.round_cards = []

        # Deal first card
        result = await self._deal_next_card(room)
        if result is None:
            raise BadRequestError(ErrorMessage.GAME_NO_CARDS_LEFT)

        card_id, content = result
        turn.round_cards.append(RoundCard(card_id=card_id, content=content, status=CardStatus.UNPLAYED))

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))
        await self.conn_manager.send_to_player(room_code, player_id, ServerEvent.card_dealt(card_id, content))

        # Start server-side timer guard
        self._schedule_timer(room_code, field.time_limit)

    # ------------------------------------------------------------------
    # CARD_SWIPE — explainer marks card as guessed/failed
    # ------------------------------------------------------------------

    async def handle_card_swipe(
        self, room_code: str, player_id: uuid.UUID, status: CardStatus
    ) -> None:
        room = await self._get_playing_room(room_code)
        turn = self._assert_explainer(room, player_id)
        self._assert_phase(turn, TurnPhase.GUESSING)

        if time.time() > turn.ends_at:
            # Timer expired — force transition to REVIEW
            await self._transition_to_review(room, room_code)
            return

        # Update current card status
        if turn.round_cards:
            current_card = turn.round_cards[-1]
            if current_card.status == CardStatus.UNPLAYED:
                current_card.status = status

        # Deal next card
        result = await self._deal_next_card(room)
        if result is not None:
            card_id, content = result
            turn.round_cards.append(RoundCard(card_id=card_id, content=content, status=CardStatus.UNPLAYED))
            await self.game_repo.save_room(room)
            await self.conn_manager.send_to_player(room_code, player_id, ServerEvent.card_dealt(card_id, content))
        else:
            # No more cards — go to review
            await self.game_repo.save_room(room)
            await self._transition_to_review(room, room_code)
            return

        await self.game_repo.save_room(room)

    # ------------------------------------------------------------------
    # TIMER_EXPIRED — client notifies that timer ran out
    # ------------------------------------------------------------------

    async def handle_timer_expired(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        turn = self._assert_explainer(room, player_id)
        self._assert_phase(turn, TurnPhase.GUESSING)

        await self._transition_to_review(room, room_code)

    # ------------------------------------------------------------------
    # EDIT_CARD_STATUS — during REVIEW, explainer corrects card statuses
    # ------------------------------------------------------------------

    async def handle_edit_card_status(
        self, room_code: str, player_id: uuid.UUID, card_id: uuid.UUID, new_status: CardStatus
    ) -> None:
        room = await self._get_playing_room(room_code)
        turn = self._assert_explainer(room, player_id)
        self._assert_phase(turn, TurnPhase.REVIEW)

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
        assert turn is not None

        # Allow both explainer and host to confirm
        if player_id != turn.explainer_id and player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.GAME_NOT_EXPLAINER)
        self._assert_phase(turn, TurnPhase.REVIEW)

        field = self._get_current_field(room)
        team = room.teams[turn.team_id]

        # Calculate score
        score_delta = 0
        for card in turn.round_cards:
            if card.status == CardStatus.GUESSED:
                score_delta += field.award
            elif card.status == CardStatus.FAILED:
                score_delta -= field.penalty

        # Return all cards back to the end of the queue
        pack_queue = room.card_queues.setdefault(field.card_pack_id, [])
        for card in turn.round_cards:
            pack_queue.append(card.card_id)

        # Update team position
        team.current_position = max(0, team.current_position + score_delta)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code,
            ServerEvent.round_results(turn.team_id, turn.round_cards, score_delta, team.current_position),
        )

        # Check win condition
        if team.current_position >= room.map_info.max_fields_count:
            await self._finish_game(room, room_code, turn.team_id)
            return

        # Rotate to next turn
        await self._rotate_turn(room, room_code)

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

        team.current_position = max(0, team.current_position + delta)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.score_updated(team_id, team.current_position))

        # Check win after manual adjustment
        if team.current_position >= room.map_info.max_fields_count:
            await self._finish_game(room, room_code, team_id)

    # ------------------------------------------------------------------
    # RESTART_TURN — host restarts the current turn
    # ------------------------------------------------------------------

    async def handle_restart_turn(self, room_code: str, player_id: uuid.UUID) -> None:
        room = await self._get_playing_room(room_code)
        if player_id != room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        self._cancel_timer(room_code)
        turn = room.current_turn
        assert turn is not None

        # Return all round cards back to queue
        field = self._get_current_field(room)
        pack_queue = room.card_queues.setdefault(field.card_pack_id, [])
        for card in turn.round_cards:
            pack_queue.append(card.card_id)

        # Reset turn to PREPARE, same team and explainer
        turn.phase = TurnPhase.PREPARE
        turn.ends_at = 0.0
        turn.round_cards = []

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))

    # ------------------------------------------------------------------
    # Internal transitions
    # ------------------------------------------------------------------

    async def _transition_to_review(self, room: RoomStateJSON, room_code: str) -> None:
        self._cancel_timer(room_code)
        turn = room.current_turn
        assert turn is not None
        turn.phase = TurnPhase.REVIEW
        turn.ends_at = 0.0

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.phase_changed(turn))

    async def _rotate_turn(self, room: RoomStateJSON, room_code: str) -> None:
        turn = room.current_turn
        assert turn is not None

        # Advance the explainer_index on the team that just finished
        finished_team = room.teams[turn.team_id]
        finished_team.explainer_index = (turn.explainer_index + 1) % len(finished_team.player_ids)

        # Pick the next team (cyclic), skipping teams with no online players
        team_ids = list(room.teams.keys())
        current_team_idx = team_ids.index(turn.team_id)
        num_teams = len(team_ids)

        for i in range(1, num_teams + 1):
            next_team_idx = (current_team_idx + i) % num_teams
            next_team_id = team_ids[next_team_idx]
            next_team = room.teams[next_team_id]

            next_explainer_id = self._find_online_explainer(room, next_team)
            if next_explainer_id is not None:
                room.current_turn = CurrentTurn(
                    team_id=next_team_id,
                    explainer_id=next_explainer_id,
                    explainer_index=next_team.explainer_index,
                    phase=TurnPhase.PREPARE,
                    ends_at=0.0,
                    round_cards=[],
                )

                await self.game_repo.save_room(room)
                assert room.current_turn is not None
                await self.conn_manager.broadcast(room_code, ServerEvent.turn_started(room.current_turn))
                return

        # No online players in any team — pause (keep current state, wait for reconnect)
        room.current_turn = None
        await self.game_repo.save_room(room)

    async def _finish_game(
        self, room: RoomStateJSON, room_code: str, winner_team_id: uuid.UUID
    ) -> None:
        self._cancel_timer(room_code)
        room.status = RoomStatus.FINISHED
        room.current_turn = None

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.game_finished(winner_team_id, room.teams))

        # Persist stats for registered users
        winner_team = room.teams[winner_team_id]
        winner_player_ids = set(winner_team.player_ids)
        all_player_ids = list(room.players.keys())

        if all_player_ids:
            # Increment games_played for all players (only registered users in DB)
            await self.db.execute(
                update(User)
                .where(User.id.in_(all_player_ids), User.deleted_at.is_(None))
                .values(games_played=User.games_played + 1)
            )

        if winner_player_ids:
            # Increment games_won for winners
            await self.db.execute(
                update(User)
                .where(User.id.in_(winner_player_ids), User.deleted_at.is_(None))
                .values(games_won=User.games_won + 1)
            )

        await self.db.commit()

    # ------------------------------------------------------------------
    # RECONNECT — player comes back, resume if paused
    # ------------------------------------------------------------------

    async def handle_player_reconnect(self, room_code: str, player_id: uuid.UUID) -> None:
        """Called when a player reconnects. If the game is PLAYING but paused
        (current_turn is None because all players were offline), resume."""
        room = await self.game_repo.get_room(room_code)
        if room is None or room.status != RoomStatus.PLAYING:
            return
        if room.current_turn is not None:
            return  # game is not paused

        # Find which team this player belongs to
        player = room.players.get(player_id)
        if player is None or player.team_id is None:
            return

        team = room.teams.get(player.team_id)
        if team is None:
            return

        # Try to start a turn with this player's team first, then cycle others
        team_ids = list(room.teams.keys())
        try:
            start_idx = team_ids.index(player.team_id)
        except ValueError:
            return

        for i in range(len(team_ids)):
            idx = (start_idx + i) % len(team_ids)
            candidate_team_id = team_ids[idx]
            candidate_team = room.teams[candidate_team_id]

            explainer_id = self._find_online_explainer(room, candidate_team)
            if explainer_id is not None:
                room.current_turn = CurrentTurn(
                    team_id=candidate_team_id,
                    explainer_id=explainer_id,
                    explainer_index=candidate_team.explainer_index,
                    phase=TurnPhase.PREPARE,
                    ends_at=0.0,
                    round_cards=[],
                )
                await self.game_repo.save_room(room)
                await self.conn_manager.broadcast(
                    room_code, ServerEvent.turn_started(room.current_turn)
                )
                return

    # ------------------------------------------------------------------
    # DISCONNECT — player disconnects
    # ------------------------------------------------------------------

    async def handle_explainer_disconnect(self, room_code: str, player_id: uuid.UUID) -> None:
        """Called when a player disconnects. If they are the current explainer,
        auto-transition or skip their turn."""
        room = await self.game_repo.get_room(room_code)
        if room is None or room.status != RoomStatus.PLAYING:
            return
        turn = room.current_turn
        if turn is None or turn.explainer_id != player_id:
            return

        if turn.phase == TurnPhase.GUESSING:
            # Mid-round: transition to review, then auto-confirm with current cards
            await self._transition_to_review(room, room_code)
            # Auto-confirm so the turn doesn't hang
            await self._auto_confirm_and_rotate(room, room_code)
        elif turn.phase == TurnPhase.PREPARE:
            # Haven't started yet — just skip to next team
            await self._rotate_turn(room, room_code)
        elif turn.phase == TurnPhase.REVIEW:
            # In review — auto-confirm
            await self._auto_confirm_and_rotate(room, room_code)

    async def _auto_confirm_and_rotate(self, room: RoomStateJSON, room_code: str) -> None:
        """Confirm results automatically (all UNPLAYED cards stay UNPLAYED, returned to queue)."""
        turn = room.current_turn
        assert turn is not None

        field = self._get_current_field(room)
        team = room.teams[turn.team_id]

        score_delta = 0
        for card in turn.round_cards:
            if card.status == CardStatus.GUESSED:
                score_delta += field.award
            elif card.status == CardStatus.FAILED:
                score_delta -= field.penalty

        # Return all cards back to the end of the queue
        pack_queue = room.card_queues.setdefault(field.card_pack_id, [])
        for card in turn.round_cards:
            pack_queue.append(card.card_id)

        team.current_position = max(0, team.current_position + score_delta)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code,
            ServerEvent.round_results(turn.team_id, turn.round_cards, score_delta, team.current_position),
        )

        if team.current_position >= room.map_info.max_fields_count:
            await self._finish_game(room, room_code, turn.team_id)
            return

        await self._rotate_turn(room, room_code)
