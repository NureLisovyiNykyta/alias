import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.card import CardPack, SavedCardPack, CardPackRating
    from app.models.map import Map, SavedMap, MapRating


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    nickname: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_code: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    verification_code_expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    reset_password_code: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    reset_password_code_expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    card_packs: Mapped[list["CardPack"]] = relationship("CardPack", back_populates="author")
    saved_card_packs: Mapped[list["SavedCardPack"]] = relationship("SavedCardPack", back_populates="user")
    card_pack_ratings: Mapped[list["CardPackRating"]] = relationship("CardPackRating", back_populates="user")

    maps: Mapped[list["Map"]] = relationship("Map", back_populates="author")
    saved_maps: Mapped[list["SavedMap"]] = relationship("SavedMap", back_populates="user")
    map_ratings: Mapped[list["MapRating"]] = relationship("MapRating", back_populates="user")
