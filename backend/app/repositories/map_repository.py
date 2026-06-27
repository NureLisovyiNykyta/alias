import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.map import Map, MapField as MapFieldORM, MapRating, MapTheme, SavedMap
from app.schemas.card_pack import SortOrder
from app.schemas.map import MapSearchScope


_SORT_COLUMNS = {
    SortOrder.newest: Map.created_at.desc(),
    SortOrder.top_rated: Map.rating_average.desc(),
    SortOrder.most_saved: Map.saves_count.desc(),
}


class MapRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _is_saved_subquery(user_id: uuid.UUID):
        """Correlated subquery: 1 if the user saved this map, 0 otherwise."""
        return (
            select(func.count())
            .where(
                SavedMap.user_id == user_id,
                SavedMap.map_id == Map.id,
            )
            .correlate(Map)
            .scalar_subquery()
        )

    @staticmethod
    def _my_rating_subquery(user_id: uuid.UUID):
        """Correlated subquery: the score the user gave to this map, or NULL."""
        return (
            select(MapRating.score)
            .where(
                MapRating.user_id == user_id,
                MapRating.map_id == Map.id,
            )
            .correlate(Map)
            .scalar_subquery()
        )

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

    async def get_by_id(self, map_id: uuid.UUID) -> Map | None:
        return (
            await self.db.execute(select(Map).where(Map.id == map_id))
        ).scalar_one_or_none()

    async def get_by_id_with_author(self, map_id: uuid.UUID) -> Map | None:
        return (
            await self.db.execute(
                select(Map).options(joinedload(Map.author)).where(Map.id == map_id)
            )
        ).scalar_one_or_none()

    async def get_user_meta(
        self, map_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[bool, int | None]:
        row = (
            await self.db.execute(
                select(
                    select(func.count())
                    .where(SavedMap.user_id == user_id, SavedMap.map_id == map_id)
                    .scalar_subquery()
                    .label("is_saved"),
                    select(MapRating.score)
                    .where(MapRating.user_id == user_id, MapRating.map_id == map_id)
                    .scalar_subquery()
                    .label("my_rating"),
                )
            )
        ).one()
        return bool(row.is_saved), row.my_rating

    async def list_public(
        self,
        limit: int,
        offset: int,
        q: str | None = None,
        size: str | None = None,
        sort_by: SortOrder = SortOrder.newest,
        user_id: uuid.UUID | None = None,
    ) -> tuple[list[Map], int]:
        base_where = [
            Map.is_public.is_(True),
            Map.deleted_at.is_(None),
            Map.status == StatusEnum.ACTIVE.value,
        ]
        if q:
            base_where.append(Map.name.ilike(f"%{q}%"))
        if size:
            base_where.append(Map.size == size.upper())
        if user_id:
            base_where.append(Map.author_id != user_id)

        total: int = (
            await self.db.execute(
                select(func.count(Map.id)).select_from(Map).where(*base_where)
            )
        ).scalar_one()

        stmt = (
            select(Map)
            .where(*base_where)
            .order_by(_SORT_COLUMNS[sort_by])
            .limit(limit)
            .offset(offset)
        )

        # Guests always get is_saved=False / my_rating=None (schema defaults),
        # no need for correlated subqueries.
        if user_id is None:
            items = (await self.db.execute(stmt)).scalars().all()
            return list(items), total

        rows = (
            await self.db.execute(
                stmt.add_columns(
                    self._is_saved_subquery(user_id),
                    self._my_rating_subquery(user_id),
                )
            )
        ).all()

        maps = []
        for map_obj, is_saved, my_rating in rows:
            map_obj.is_saved = bool(is_saved)
            map_obj.my_rating = my_rating
            maps.append(map_obj)

        return maps, total

    async def list_my(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
        q: str | None = None,
        status: StatusEnum | None = None,
    ) -> tuple[list[Map], int]:
        # Own maps — is_saved/my_rating are always False/None (schema defaults)
        base_where = [
            Map.author_id == user_id,
            Map.deleted_at.is_(None),
        ]
        if q:
            base_where.append(Map.name.ilike(f"%{q}%"))
        if status:
            base_where.append(Map.status == status.value)

        total: int = (
            await self.db.execute(
                select(func.count(Map.id)).select_from(Map).where(*base_where)
            )
        ).scalar_one()

        items = (
            await self.db.execute(
                select(Map)
                .where(*base_where)
                .order_by(Map.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()

        return list(items), total

    async def list_saved(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
        q: str | None = None,
    ) -> tuple[list[Map], int]:
        # All maps here are saved by definition — is_saved=True always
        base_where = [
            SavedMap.user_id == user_id,
            Map.deleted_at.is_(None),
        ]
        if q:
            base_where.append(Map.name.ilike(f"%{q}%"))

        total: int = (
            await self.db.execute(
                select(func.count(Map.id))
                .select_from(Map)
                .join(SavedMap, SavedMap.map_id == Map.id)
                .where(*base_where)
            )
        ).scalar_one()

        rows = (
            await self.db.execute(
                select(Map, self._my_rating_subquery(user_id))
                .join(SavedMap, SavedMap.map_id == Map.id)
                .where(*base_where)
                .order_by(SavedMap.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()

        maps = []
        for map_obj, my_rating in rows:
            map_obj.is_saved = True
            map_obj.my_rating = my_rating
            maps.append(map_obj)

        return maps, total

    async def list_deleted(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
    ) -> tuple[list[Map], int]:
        # Own deleted maps — is_saved/my_rating are always False/None (schema defaults)
        base_where = [
            Map.author_id == user_id,
            Map.deleted_at.is_not(None),
        ]

        total: int = (
            await self.db.execute(
                select(func.count(Map.id)).select_from(Map).where(*base_where)
            )
        ).scalar_one()

        items = (
            await self.db.execute(
                select(Map)
                .where(*base_where)
                .order_by(Map.deleted_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()

        return list(items), total

    async def search(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
        q: str | None = None,
        size: str | None = None,
        scope: MapSearchScope = MapSearchScope.available,
        sort_by: SortOrder = SortOrder.newest,
    ) -> tuple[list[Map], int]:
        saved_exists = (
            select(SavedMap.map_id)
            .where(
                SavedMap.user_id == user_id,
                SavedMap.map_id == Map.id,
            )
            .exists()
        )
        public_active = and_(
            Map.is_public.is_(True),
            Map.status == StatusEnum.ACTIVE.value,
        )

        base_where = [Map.deleted_at.is_(None)]

        if scope == MapSearchScope.my:
            base_where.append(Map.author_id == user_id)
        elif scope == MapSearchScope.public:
            base_where.append(public_active)
        elif scope == MapSearchScope.saved:
            base_where.append(saved_exists)
        else:  # available
            base_where.append(
                or_(
                    Map.author_id == user_id,
                    public_active,
                    saved_exists,
                )
            )

        if q:
            base_where.append(Map.name.ilike(f"%{q}%"))
        if size:
            base_where.append(Map.size == size.upper())

        total: int = (
            await self.db.execute(
                select(func.count(Map.id)).select_from(Map).where(*base_where)
            )
        ).scalar_one()

        rows = (
            await self.db.execute(
                select(
                    Map,
                    self._is_saved_subquery(user_id),
                    self._my_rating_subquery(user_id),
                )
                .where(*base_where)
                .order_by(_SORT_COLUMNS[sort_by])
                .limit(limit)
                .offset(offset)
            )
        ).all()

        maps = []
        for map_obj, is_saved, my_rating in rows:
            map_obj.is_saved = bool(is_saved)
            map_obj.my_rating = my_rating
            maps.append(map_obj)

        return maps, total

    async def get_all_themes(self) -> list[MapTheme]:
        return list(
            (await self.db.execute(select(MapTheme).order_by(MapTheme.name))).scalars().all()
        )

