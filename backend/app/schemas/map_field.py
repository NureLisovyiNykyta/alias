import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.card_pack import CardPackBriefRead


class MapFieldItem(BaseModel):
    id: uuid.UUID | None = None
    position_index: int = Field(ge=0)
    time_limit: int = Field(ge=10, le=600)
    award: int = Field(ge=0, le=10)
    penalty: int = Field(ge=0, le=10)
    card_pack_id: uuid.UUID | None = None


class BulkMapFieldSync(BaseModel):
    fields: list[MapFieldItem]


class MapFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position_index: int
    time_limit: int
    award: int
    penalty: int
    map_id: uuid.UUID
    card_pack_id: uuid.UUID | None
    card_pack: CardPackBriefRead | None
