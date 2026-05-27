import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.map import Map, MapField as MapFieldORM, MapTheme


class MapRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_theme(self, theme_id: uuid.UUID) -> MapTheme | None:
        result = await self.db.execute(
            select(MapTheme).where(MapTheme.id == theme_id)
        )
        return result.scalar_one_or_none()

    async def get_map_with_relations(self, map_id: uuid.UUID) -> Map:
        result = await self.db.execute(
            select(Map)
            .options(
                joinedload(Map.fields)
                .joinedload(MapFieldORM.card_pack)
                .joinedload(CardPack.type),
            )
            .where(
                Map.id == map_id,
                Map.deleted_at.is_(None),
                Map.status == StatusEnum.ACTIVE.value,
            )
        )
        map_obj: Map | None = result.unique().scalar_one_or_none()
        if map_obj is None:
            raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)
        return map_obj
