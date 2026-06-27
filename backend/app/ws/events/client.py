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
    payload: CardSwipePayload | EditCardStatusPayload | AdjustScorePayload | ChatMessagePayload | None = None
