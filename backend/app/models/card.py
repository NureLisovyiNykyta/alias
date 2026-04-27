import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Float, ForeignKey, Index, Integer, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import CardMechanicEnum, StatusEnum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.map import MapField


class CardType(Base):
    __tablename__ = "card_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    core_mechanic: Mapped[str] = mapped_column(String, default=CardMechanicEnum.CLASSIC_ALIAS.value, nullable=False, index=True)
    allowed_modifiers: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    schema: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')

    card_packs: Mapped[list["CardPack"]] = relationship("CardPack", back_populates="type")


class CardPack(Base):
    __tablename__ = "card_packs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String, default=StatusEnum.DRAFT.value, index=True, nullable=False)
    rating_average: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    saves_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("card_types.id"), index=True, nullable=False)

    __table_args__ = (
        Index("ix_card_packs_public_new", "is_public", "is_deleted", "status", "created_at"),
        Index("ix_card_packs_public_top_rated", "is_public", "is_deleted", "status", "rating_average"),
        Index("ix_card_packs_public_most_saved", "is_public", "is_deleted", "status", "saves_count"),
        Index("ix_card_packs_author_list", "author_id", "is_deleted", "created_at"),
    )

    author: Mapped["User"] = relationship("User", back_populates="card_packs")
    type: Mapped["CardType"] = relationship("CardType", back_populates="card_packs")
    cards: Mapped[list["Card"]] = relationship("Card", back_populates="card_pack")
    saved_by: Mapped[list["SavedCardPack"]] = relationship("SavedCardPack", back_populates="card_pack")
    ratings: Mapped[list["CardPackRating"]] = relationship("CardPackRating", back_populates="card_pack")
    map_fields: Mapped[list["MapField"]] = relationship("MapField", back_populates="card_pack")


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    card_pack_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("card_packs.id"), index=True, nullable=False)

    card_pack: Mapped["CardPack"] = relationship("CardPack", back_populates="cards")


class SavedCardPack(Base):
    __tablename__ = "saved_card_packs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    card_pack_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("card_packs.id"), primary_key=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="saved_card_packs")
    card_pack: Mapped["CardPack"] = relationship("CardPack", back_populates="saved_by")


class CardPackRating(Base):
    __tablename__ = "card_pack_ratings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    card_pack_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("card_packs.id"), primary_key=True, index=True)
    score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (CheckConstraint("score >= 1 AND score <= 5", name="ck_card_pack_ratings_score"),)

    user: Mapped["User"] = relationship("User", back_populates="card_pack_ratings")
    card_pack: Mapped["CardPack"] = relationship("CardPack", back_populates="ratings")
