import datetime
import enum
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserPublicRead


class SortOrder(str, enum.Enum):
    newest = "newest"
    top_rated = "top_rated"
    most_saved = "most_saved"


class CardPackCreate(BaseModel):
    name: str
    description: str
    type_id: uuid.UUID


class CardPackUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CardPackRatingInput(BaseModel):
    score: int = Field(ge=1, le=5)


class CardPackBriefRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    is_public: bool
    status: str


class CardPackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    is_public: bool
    status: str
    rating_average: float
    rating_count: int
    saves_count: int
    cover_url: str | None
    author_id: uuid.UUID
    type_id: uuid.UUID
    deleted_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class CardTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str
    core_mechanic: str
    allowed_modifiers: list[str]


class CardPackReadDetailed(CardPackRead):
    author: UserPublicRead
    card_type: CardTypeRead = Field(validation_alias="type")
