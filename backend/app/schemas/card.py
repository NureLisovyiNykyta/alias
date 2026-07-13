import uuid

from pydantic import BaseModel, ConfigDict


class CardItem(BaseModel):
    id: uuid.UUID | None = None
    content: dict


class BulkCardSync(BaseModel):
    cards: list[CardItem]


class CardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content: dict
    card_pack_id: uuid.UUID
