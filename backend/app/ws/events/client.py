from enum import StrEnum

from pydantic import BaseModel


class ClientEventType(StrEnum):
    PING = "ping"


class ClientEvent(BaseModel):
    type: ClientEventType
