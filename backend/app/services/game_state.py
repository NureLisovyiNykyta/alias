"""Pure helper functions for manipulating RoomStateJSON.

All functions are synchronous and have no side effects beyond mutating the
passed-in room / turn objects.  They never do I/O (no DB, no Redis, no WS).
"""

from __future__ import annotations

import uuid

from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.messages import ErrorMessage
from app.schemas.game_room import (
    CardStatus,
    CurrentTurn,
    MapField,
    RoomStateJSON,
    Team,
    TurnPhase,
)


# ------------------------------------------------------------------
# Assertions
# ------------------------------------------------------------------


def assert_explainer(room: RoomStateJSON, player_id: uuid.UUID) -> CurrentTurn:
    """Return current turn or raise if player is not the explainer."""
    turn = room.current_turn
    if turn is None:
        raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)
    if turn.explainer_id != player_id:
        raise ForbiddenError(ErrorMessage.GAME_NOT_EXPLAINER)
    return turn


def assert_phase(turn: CurrentTurn, phase: TurnPhase) -> None:
    if turn.phase != phase:
        raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)


# ------------------------------------------------------------------
# State queries
# ------------------------------------------------------------------


def get_current_field(room: RoomStateJSON) -> MapField:
    """Return the MapField for the current team's position."""
    turn = room.current_turn
    if turn is None:
        raise BadRequestError(ErrorMessage.GAME_WRONG_PHASE)
    team = room.teams[turn.team_id]
    position = team.current_position
    field = room.map_info.fields.get(position)
    if field is None:
        max_pos = max(room.map_info.fields.keys()) if room.map_info.fields else 0
        field = room.map_info.fields[min(position, max_pos)]
    return field


def find_online_explainer(room: RoomStateJSON, team: Team) -> uuid.UUID | None:
    """Find the next online player in *team* starting from ``team.explainer_index``.

    Updates ``team.explainer_index`` to point at the found player.
    Returns ``None`` if nobody is online.
    """
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


def determine_winner(room: RoomStateJSON) -> uuid.UUID | None:
    """Determine winner for early game end.

    Returns the team_id of the sole leader, or ``None`` on a draw / all at 0.
    """
    max_position = max(t.current_position for t in room.teams.values())
    if max_position <= 0:
        return None
    leaders = [
        tid for tid, t in room.teams.items() if t.current_position == max_position
    ]
    return leaders[0] if len(leaders) == 1 else None


# ------------------------------------------------------------------
# State mutations
# ------------------------------------------------------------------


def pop_next_card_id(room: RoomStateJSON) -> uuid.UUID | None:
    """Pop the next card from the queue for the current field's card pack."""
    field = get_current_field(room)
    queue = room.card_queues.get(field.card_pack_id, [])
    if not queue:
        return None
    return queue.pop(0)


def remove_player_from_team(room: RoomStateJSON, player_id: uuid.UUID) -> None:
    """Remove a player from their team's ``player_ids``.

    Adjusts ``explainer_index`` if it goes out of bounds.
    """
    player = room.players.get(player_id)
    if player is None:
        return
    team_id = player.team_id
    if team_id is None or team_id not in room.teams:
        return
    team = room.teams[team_id]
    if player_id in team.player_ids:
        team.player_ids.remove(player_id)
        if team.explainer_index >= len(team.player_ids) and team.player_ids:
            team.explainer_index = 0


def calculate_score_and_return_cards(room: RoomStateJSON) -> int:
    """Calculate score delta, update team position, return cards to queue.

    Returns the score delta.
    """
    turn = room.current_turn
    if turn is None:
        return 0

    field = get_current_field(room)
    team = room.teams[turn.team_id]

    score_delta = 0
    for card in turn.round_cards:
        if card.status == CardStatus.GUESSED:
            score_delta += field.award
        elif card.status == CardStatus.FAILED:
            score_delta -= field.penalty

    _return_round_cards_to_queue(room, turn, field)

    max_pos = room.map_info.max_fields_count
    team.current_position = max(0, min(team.current_position + score_delta, max_pos))
    return score_delta


def return_cards_to_queue(room: RoomStateJSON) -> None:
    """Return all round cards to the queue *without* scoring."""
    turn = room.current_turn
    if turn is None:
        return
    field = get_current_field(room)
    _return_round_cards_to_queue(room, turn, field)


def _return_round_cards_to_queue(
    room: RoomStateJSON, turn: CurrentTurn, field: MapField
) -> None:
    pack_queue = room.card_queues.setdefault(field.card_pack_id, [])
    for card in turn.round_cards:
        pack_queue.append(card.card_id)


def clamp_team_position(room: RoomStateJSON, team: Team, delta: int) -> None:
    """Apply *delta* to team position, clamped to [0, max_fields_count]."""
    max_pos = room.map_info.max_fields_count
    team.current_position = max(0, min(team.current_position + delta, max_pos))


# ------------------------------------------------------------------
# Factories
# ------------------------------------------------------------------


def make_prepare_turn(
    team_id: uuid.UUID,
    explainer_id: uuid.UUID,
    explainer_index: int,
) -> CurrentTurn:
    """Create a fresh ``CurrentTurn`` in PREPARE phase."""
    return CurrentTurn(
        team_id=team_id,
        explainer_id=explainer_id,
        explainer_index=explainer_index,
        phase=TurnPhase.PREPARE,
        ends_at=0.0,
        round_cards=[],
    )
