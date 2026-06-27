from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.schemas.chat import ChatMessage
from app.schemas.game_room import CurrentTurn, Player, RoomStateJSON, RoundCard, Team


class ServerEventType(StrEnum):
    ROOM_STATE = "room_state"
    PLAYER_CONNECTED = "player_connected"
    PLAYER_DISCONNECTED = "player_disconnected"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    GAME_STARTED = "game_started"
    ROOM_CLOSED = "room_closed"
    ERROR = "error"
    TEAM_CREATED = "team_created"
    TEAM_UPDATED = "team_updated"
    TEAM_DELETED = "team_deleted"
    PLAYER_TEAM_CHANGED = "player_team_changed"

    # Game events
    TURN_STARTED = "turn_started"
    PHASE_CHANGED = "phase_changed"
    CARD_DEALT = "card_dealt"
    CARD_SWIPED = "card_swiped"
    ROUND_RESULTS = "round_results"
    SCORE_UPDATED = "score_updated"
    GAME_FINISHED = "game_finished"

    # Chat events
    CHAT_MESSAGE = "chat_message"
    CHAT_HISTORY = "chat_history"


# ---------------------------------------------------------------------------
# Payloads
# ---------------------------------------------------------------------------


class RoomStatePayload(BaseModel):
    room: RoomStateJSON


class PlayerConnectedPayload(BaseModel):
    player: Player


class PlayerDisconnectedPayload(BaseModel):
    player_id: UUID


class PlayerJoinedPayload(BaseModel):
    player: Player


class PlayerLeftPayload(BaseModel):
    player_id: UUID


class GameStartedPayload(BaseModel):
    room: RoomStateJSON


class RoomClosedPayload(BaseModel):
    room_code: str


class ErrorPayload(BaseModel):
    message: str


class TeamCreatedPayload(BaseModel):
    team: Team


class TeamUpdatedPayload(BaseModel):
    team: Team


class TeamDeletedPayload(BaseModel):
    team_id: UUID
    kicked_player_ids: list[UUID]


class PlayerTeamChangedPayload(BaseModel):
    player_id: UUID
    old_team_id: UUID | None
    new_team_id: UUID | None


# --- Game payloads ---


class TurnStartedPayload(BaseModel):
    current_turn: CurrentTurn
    remaining_seconds: float


class PhaseChangedPayload(BaseModel):
    current_turn: CurrentTurn
    remaining_seconds: float | None = None


class CardDealtPayload(BaseModel):
    card_id: UUID
    content: dict[str, Any]


class CardSwipedPayload(BaseModel):
    card_id: UUID
    content: dict[str, Any]
    status: str  # GUESSED or FAILED


class RoundResultsPayload(BaseModel):
    team_id: UUID
    round_cards: list[RoundCard]
    score_delta: int
    new_position: int


class ScoreUpdatedPayload(BaseModel):
    team_id: UUID
    new_position: int


class GameFinishedPayload(BaseModel):
    winner_team_id: UUID | None
    teams: dict[UUID, Team]


class ChatMessagePayload(BaseModel):
    message: ChatMessage


class ChatHistoryPayload(BaseModel):
    room_messages: list[ChatMessage]
    team_messages: list[ChatMessage]


# ---------------------------------------------------------------------------
# ServerEvent
# ---------------------------------------------------------------------------


class ServerEvent(BaseModel):
    type: ServerEventType
    payload: (
        RoomStatePayload
        | PlayerConnectedPayload
        | PlayerDisconnectedPayload
        | PlayerJoinedPayload
        | PlayerLeftPayload
        | GameStartedPayload
        | RoomClosedPayload
        | ErrorPayload
        | TeamCreatedPayload
        | TeamUpdatedPayload
        | TeamDeletedPayload
        | PlayerTeamChangedPayload
        | TurnStartedPayload
        | PhaseChangedPayload
        | CardDealtPayload
        | CardSwipedPayload
        | RoundResultsPayload
        | ScoreUpdatedPayload
        | GameFinishedPayload
        | ChatMessagePayload
        | ChatHistoryPayload
    )

    # --- Lobby ---

    @classmethod
    def room_state(cls, room: RoomStateJSON) -> "ServerEvent":
        return cls(type=ServerEventType.ROOM_STATE, payload=RoomStatePayload(room=room))

    @classmethod
    def player_connected(cls, player: Player) -> "ServerEvent":
        return cls(type=ServerEventType.PLAYER_CONNECTED, payload=PlayerConnectedPayload(player=player))

    @classmethod
    def player_disconnected(cls, player_id: UUID) -> "ServerEvent":
        return cls(type=ServerEventType.PLAYER_DISCONNECTED, payload=PlayerDisconnectedPayload(player_id=player_id))

    @classmethod
    def player_joined(cls, player: Player) -> "ServerEvent":
        return cls(type=ServerEventType.PLAYER_JOINED, payload=PlayerJoinedPayload(player=player))

    @classmethod
    def player_left(cls, player_id: UUID) -> "ServerEvent":
        return cls(type=ServerEventType.PLAYER_LEFT, payload=PlayerLeftPayload(player_id=player_id))

    @classmethod
    def game_started(cls, room: RoomStateJSON) -> "ServerEvent":
        return cls(type=ServerEventType.GAME_STARTED, payload=GameStartedPayload(room=room))

    @classmethod
    def room_closed(cls, room_code: str) -> "ServerEvent":
        return cls(type=ServerEventType.ROOM_CLOSED, payload=RoomClosedPayload(room_code=room_code))

    @classmethod
    def error(cls, message: str) -> "ServerEvent":
        return cls(type=ServerEventType.ERROR, payload=ErrorPayload(message=message))

    @classmethod
    def team_created(cls, team: Team) -> "ServerEvent":
        return cls(type=ServerEventType.TEAM_CREATED, payload=TeamCreatedPayload(team=team))

    @classmethod
    def team_updated(cls, team: Team) -> "ServerEvent":
        return cls(type=ServerEventType.TEAM_UPDATED, payload=TeamUpdatedPayload(team=team))

    @classmethod
    def team_deleted(cls, team_id: UUID, kicked_player_ids: list[UUID]) -> "ServerEvent":
        return cls(
            type=ServerEventType.TEAM_DELETED,
            payload=TeamDeletedPayload(team_id=team_id, kicked_player_ids=kicked_player_ids),
        )

    @classmethod
    def player_team_changed(
        cls, player_id: UUID, old_team_id: UUID | None, new_team_id: UUID | None
    ) -> "ServerEvent":
        return cls(
            type=ServerEventType.PLAYER_TEAM_CHANGED,
            payload=PlayerTeamChangedPayload(
                player_id=player_id, old_team_id=old_team_id, new_team_id=new_team_id
            ),
        )

    # --- Game ---

    @classmethod
    def turn_started(cls, current_turn: CurrentTurn, remaining_seconds: float = 0.0) -> "ServerEvent":
        return cls(type=ServerEventType.TURN_STARTED, payload=TurnStartedPayload(current_turn=current_turn, remaining_seconds=remaining_seconds))

    @classmethod
    def phase_changed(cls, current_turn: CurrentTurn, remaining_seconds: float | None = None) -> "ServerEvent":
        return cls(type=ServerEventType.PHASE_CHANGED, payload=PhaseChangedPayload(current_turn=current_turn, remaining_seconds=remaining_seconds))

    @classmethod
    def card_dealt(cls, card_id: UUID, content: dict[str, Any]) -> "ServerEvent":
        return cls(type=ServerEventType.CARD_DEALT, payload=CardDealtPayload(card_id=card_id, content=content))

    @classmethod
    def card_swiped(cls, card_id: UUID, content: dict[str, Any], status: str) -> "ServerEvent":
        return cls(type=ServerEventType.CARD_SWIPED, payload=CardSwipedPayload(card_id=card_id, content=content, status=status))

    @classmethod
    def round_results(
        cls, team_id: UUID, round_cards: list[RoundCard], score_delta: int, new_position: int
    ) -> "ServerEvent":
        return cls(
            type=ServerEventType.ROUND_RESULTS,
            payload=RoundResultsPayload(
                team_id=team_id, round_cards=round_cards, score_delta=score_delta, new_position=new_position
            ),
        )

    @classmethod
    def score_updated(cls, team_id: UUID, new_position: int) -> "ServerEvent":
        return cls(type=ServerEventType.SCORE_UPDATED, payload=ScoreUpdatedPayload(team_id=team_id, new_position=new_position))

    @classmethod
    def game_finished(cls, winner_team_id: UUID | None, teams: dict[UUID, Team]) -> "ServerEvent":
        return cls(type=ServerEventType.GAME_FINISHED, payload=GameFinishedPayload(winner_team_id=winner_team_id, teams=teams))

    # --- Chat ---

    @classmethod
    def chat_message(cls, message: ChatMessage) -> "ServerEvent":
        return cls(type=ServerEventType.CHAT_MESSAGE, payload=ChatMessagePayload(message=message))

    @classmethod
    def chat_history(cls, room_messages: list[ChatMessage], team_messages: list[ChatMessage]) -> "ServerEvent":
        return cls(type=ServerEventType.CHAT_HISTORY, payload=ChatHistoryPayload(room_messages=room_messages, team_messages=team_messages))

