import datetime
import enum
import uuid

from pydantic import BaseModel, ConfigDict, Field


class SortOrder(str, enum.Enum):
    newest = "newest"
    top_rated = "top_rated"
    most_saved = "most_saved"


class CardPackCreate(BaseModel):
    name: str
    description: str
    is_public: bool
    type_id: uuid.UUID


class CardPackUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None


class CardPackRatingInput(BaseModel):
    score: int = Field(ge=1, le=5)


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
    author_id: uuid.UUID
    type_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
