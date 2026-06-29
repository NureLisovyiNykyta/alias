from enum import StrEnum
from uuid import UUID
from pydantic import BaseModel

from app.schemas.chat import ChatTarget, MessageType
from app.schemas.game_room import CardStatus


class ClientEventType(StrEnum):
    PING = "ping"

    # Game flow
    READY = "ready"
    CARD_SWIPE = "card_swipe"
    EDIT_CARD_STATUS = "edit_card_status"
    CONFIRM_RESULTS = "confirm_results"

    # Host actions
    ADJUST_SCORE = "adjust_score"
    RESTART_TURN = "restart_turn"
    END_GAME = "end_game"
    KICK_PLAYER = "kick_player"
    MOVE_PLAYER = "move_player"
    REORDER_TEAMS = "reorder_teams"

    # Chat
    CHAT_MESSAGE = "chat_message"


# ---------------------------------------------------------------------------
# Payloads
# ---------------------------------------------------------------------------


class CardSwipePayload(BaseModel):
    status: CardStatus  # GUESSED or FAILED


class EditCardStatusPayload(BaseModel):
    card_id: UUID
    new_status: CardStatus  # GUESSED or FAILED


class AdjustScorePayload(BaseModel):
    team_id: UUID
    delta: int


class KickPlayerPayload(BaseModel):
    player_id: UUID


class MovePlayerPayload(BaseModel):
    player_id: UUID
    target_team_id: UUID


class ReorderTeamsPayload(BaseModel):
    team_ids: list[UUID]


class ChatMessagePayload(BaseModel):
    target: ChatTarget
    content: str
    message_type: MessageType = MessageType.TEXT
    media_url: str | None = None


# ---------------------------------------------------------------------------
# ClientEvent
# ---------------------------------------------------------------------------


class ClientEvent(BaseModel):
    type: ClientEventType
    payload: (
        CardSwipePayload
        | EditCardStatusPayload
        | AdjustScorePayload
        | KickPlayerPayload
        | MovePlayerPayload
        | ReorderTeamsPayload
        | ChatMessagePayload
        | None
    ) = None
