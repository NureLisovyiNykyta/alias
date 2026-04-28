import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserPublicRead


class MapCreate(BaseModel):
    name: str
    is_public: bool
    template_id: uuid.UUID


class MapUpdate(BaseModel):
    name: str | None = None
    is_public: bool | None = None


class MapRatingInput(BaseModel):
    score: int = Field(ge=1, le=5)


class MapRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    is_public: bool
    status: str
    rating_average: float
    rating_count: int
    saves_count: int
    cover_url: str | None
    author_id: uuid.UUID
    template_id: uuid.UUID
    deleted_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class MapTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    max_fields_count: int
    model_3d_url: str | None


class MapReadDetailed(MapRead):
    author: UserPublicRead
    template: MapTemplateRead
