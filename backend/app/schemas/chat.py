import time
import uuid
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class MessageType(StrEnum):
    TEXT = "text"
    GIF = "gif"


class ChatTarget(StrEnum):
    ROOM = "room"
    TEAM = "team"


class ChatMessage(BaseModel):
    message_id: UUID = Field(default_factory=uuid.uuid4)
    sender_id: UUID
    sender_nickname: str
    sender_avatar_url: str | None = None
    target: ChatTarget
    team_id: UUID | None = None
    content: str
    message_type: MessageType = MessageType.TEXT
    media_url: str | None = None
    sent_at: float = Field(default_factory=time.time)
