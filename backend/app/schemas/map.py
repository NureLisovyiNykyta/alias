import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserPublicRead


class MapCreate(BaseModel):
    name: str
    size: str


class MapUpdate(BaseModel):
    name: str | None = None


class MapRatingInput(BaseModel):
    score: int = Field(ge=1, le=5)


class MapThemeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    preview_url: str | None
    scene_url_small: str | None
    scene_url_medium: str | None
    scene_url_large: str | None
    piece_model_url: str | None
    background_url: str | None
    color_textures: dict[str, str] | None


class MapSizeRead(BaseModel):
    code: str
    max_fields: int


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
    size: str
    max_fields_count: int
    deleted_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class MapReadDetailed(MapRead):
    author: UserPublicRead

