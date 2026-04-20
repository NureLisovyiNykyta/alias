import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Float, ForeignKey, Index, Integer, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import StatusEnum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.card import CardPack


class MapTemplate(Base):
    __tablename__ = "map_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    max_fields_count: Mapped[int] = mapped_column(Integer, nullable=False)
    model_3d_url: Mapped[str | None] = mapped_column("3d_model_url", String, nullable=True)

    maps: Mapped[list["Map"]] = relationship("Map", back_populates="template")


class Map(Base):
    __tablename__ = "maps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default=StatusEnum.DRAFT.value, index=True, nullable=False)
    rating_average: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    saves_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("map_templates.id"), index=True, nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)

    __table_args__ = (
        Index("ix_maps_public_new", "is_public", "is_deleted", "status", "created_at"),
        Index("ix_maps_public_top_rated", "is_public", "is_deleted", "status", "rating_average"),
        Index("ix_maps_public_most_saved", "is_public", "is_deleted", "status", "saves_count"),
        Index("ix_maps_author_list", "author_id", "is_deleted", "created_at"),
    )

    template: Mapped["MapTemplate"] = relationship("MapTemplate", back_populates="maps")
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
