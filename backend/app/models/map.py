import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, JSON, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import StatusEnum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.card import CardPack


MAP_SIZE_FIELDS: dict[str, int] = {
    "SMALL": 32,
    "MEDIUM": 48,
    "LARGE": 64,
}


class MapTheme(Base):
    __tablename__ = "map_themes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    preview_url: Mapped[str | None] = mapped_column(String, nullable=True)
    scene_url_small: Mapped[str | None] = mapped_column(String, nullable=True)
    scene_url_medium: Mapped[str | None] = mapped_column(String, nullable=True)
    scene_url_large: Mapped[str | None] = mapped_column(String, nullable=True)
    piece_model_url: Mapped[str | None] = mapped_column(String, nullable=True)
    color_textures: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Map(Base):
    __tablename__ = "maps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status: Mapped[str] = mapped_column(String, default=StatusEnum.DRAFT.value, index=True, nullable=False)
    rating_average: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    saves_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    size: Mapped[str] = mapped_column(String, nullable=False, index=True)

    max_fields_count: Mapped[int] = mapped_column(Integer, nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)

    __table_args__ = (
        Index(
            "ix_maps_public_new",
            "created_at",
            postgresql_where=(is_public.is_(True)) & (deleted_at.is_(None)) & (status == StatusEnum.ACTIVE.value)
        ),
        Index(
            "ix_maps_public_top_rated",
            "rating_average",
            postgresql_where=(is_public.is_(True)) & (deleted_at.is_(None)) & (status == StatusEnum.ACTIVE.value)
        ),
        Index(
            "ix_maps_public_most_saved",
            "saves_count",
            postgresql_where=(is_public.is_(True)) & (deleted_at.is_(None)) & (status == StatusEnum.ACTIVE.value)
        ),
        Index(
            "ix_maps_public_size",
            "size",
            postgresql_where=(is_public.is_(True)) & (deleted_at.is_(None)) & (status == StatusEnum.ACTIVE.value)
        ),
        Index(
            "ix_maps_author_active",
            "author_id",
            "created_at",
            postgresql_where=deleted_at.is_(None)
        ),
        Index(
            "ix_maps_author_trash",
            "author_id",
            "deleted_at",
            postgresql_where=deleted_at.is_not(None)
        ),
    )

    author: Mapped["User"] = relationship("User", back_populates="maps")
    fields: Mapped[list["MapField"]] = relationship("MapField", back_populates="map")
    saved_by: Mapped[list["SavedMap"]] = relationship("SavedMap", back_populates="map")
    ratings: Mapped[list["MapRating"]] = relationship("MapRating", back_populates="map")


class MapField(Base):
    __tablename__ = "map_fields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    position_index: Mapped[int] = mapped_column(Integer, nullable=False)
    time_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    award: Mapped[int] = mapped_column(Integer, nullable=False)
    penalty: Mapped[int] = mapped_column(Integer, nullable=False)

    map_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("maps.id"), index=True, nullable=False)
    card_pack_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("card_packs.id"), index=True, nullable=True)

    map: Mapped["Map"] = relationship("Map", back_populates="fields")
    card_pack: Mapped["CardPack | None"] = relationship("CardPack", back_populates="map_fields")


class SavedMap(Base):
    __tablename__ = "saved_maps"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    map_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("maps.id"), primary_key=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="saved_maps")
    map: Mapped["Map"] = relationship("Map", back_populates="saved_by")


class MapRating(Base):
    __tablename__ = "map_ratings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    map_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("maps.id"), primary_key=True, index=True)
    score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (CheckConstraint("score >= 1 AND score <= 5", name="ck_map_ratings_score"),)

    user: Mapped["User"] = relationship("User", back_populates="map_ratings")
    map: Mapped["Map"] = relationship("Map", back_populates="ratings")
