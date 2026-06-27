import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.card import CardPack, CardPackRating, CardType, SavedCardPack
from app.models.enums import StatusEnum
from app.schemas.card_pack import CardPackSearchScope, SortOrder


_SORT_COLUMNS = {
    SortOrder.newest: CardPack.created_at.desc(),
    SortOrder.top_rated: CardPack.rating_average.desc(),
    SortOrder.most_saved: CardPack.saves_count.desc(),
}


class CardPackRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _is_saved_subquery(user_id: uuid.UUID):
        """Correlated subquery: 1 if the user saved this pack, 0 otherwise."""
        return (
            select(func.count())
            .where(
                SavedCardPack.user_id == user_id,
                SavedCardPack.card_pack_id == CardPack.id,
            )
            .correlate(CardPack)
            .scalar_subquery()
        )

    @staticmethod
    def _my_rating_subquery(user_id: uuid.UUID):
        """Correlated subquery: the score the user gave to this pack, or NULL."""
        return (
            select(CardPackRating.score)
            .where(
                CardPackRating.user_id == user_id,
                CardPackRating.card_pack_id == CardPack.id,
            )
            .correlate(CardPack)
            .scalar_subquery()
        )

    async def get_by_id(self, pack_id: uuid.UUID) -> CardPack | None:
        return (
            await self.db.execute(select(CardPack).where(CardPack.id == pack_id))
        ).scalar_one_or_none()

    async def get_by_id_with_relations(self, pack_id: uuid.UUID) -> CardPack | None:
        return (
            await self.db.execute(
                select(CardPack)
                .options(joinedload(CardPack.author), joinedload(CardPack.type))
                .where(CardPack.id == pack_id)
            )
        ).scalar_one_or_none()

    async def get_user_meta(
        self, pack_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[bool, int | None]:
        row = (
            await self.db.execute(
                select(
                    select(func.count())
                    .where(
                        SavedCardPack.user_id == user_id,
                        SavedCardPack.card_pack_id == pack_id,
                    )
                    .scalar_subquery()
                    .label("is_saved"),
                    select(CardPackRating.score)
                    .where(
                        CardPackRating.user_id == user_id,
                        CardPackRating.card_pack_id == pack_id,
                    )
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
        type_id: uuid.UUID | None = None,
        sort_by: SortOrder = SortOrder.newest,
        user_id: uuid.UUID | None = None,
    ) -> tuple[list[CardPack], int]:
        base_where = [
            CardPack.is_public.is_(True),
            CardPack.deleted_at.is_(None),
            CardPack.status == StatusEnum.ACTIVE.value,
        ]
        if q:
            base_where.append(CardPack.name.ilike(f"%{q}%"))
        if type_id:
            base_where.append(CardPack.type_id == type_id)
        if user_id:
            base_where.append(CardPack.author_id != user_id)

        total: int = (
            await self.db.execute(
                select(func.count(CardPack.id)).select_from(CardPack).where(*base_where)
            )
        ).scalar_one()

        stmt = (
            select(CardPack)
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

        packs = []
        for pack, is_saved, my_rating in rows:
            pack.is_saved = bool(is_saved)
            pack.my_rating = my_rating
            packs.append(pack)

        return packs, total

    async def list_my(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
        q: str | None = None,
        status: StatusEnum | None = None,
    ) -> tuple[list[CardPack], int]:
        # Own packs — is_saved/my_rating are always False/None (schema defaults)
        base_where = [
            CardPack.author_id == user_id,
            CardPack.deleted_at.is_(None),
        ]
        if q:
            base_where.append(CardPack.name.ilike(f"%{q}%"))
        if status:
            base_where.append(CardPack.status == status.value)

        total: int = (
            await self.db.execute(
                select(func.count(CardPack.id)).select_from(CardPack).where(*base_where)
            )
        ).scalar_one()

        items = (
            await self.db.execute(
                select(CardPack)
                .where(*base_where)
                .order_by(CardPack.created_at.desc())
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
    ) -> tuple[list[CardPack], int]:
        # All packs here are saved by definition — is_saved=True always
        base_where = [
            SavedCardPack.user_id == user_id,
            CardPack.deleted_at.is_(None),
        ]
        if q:
            base_where.append(CardPack.name.ilike(f"%{q}%"))

        total: int = (
            await self.db.execute(
                select(func.count(CardPack.id))
                .select_from(CardPack)
                .join(SavedCardPack, SavedCardPack.card_pack_id == CardPack.id)
                .where(*base_where)
            )
        ).scalar_one()

        rows = (
            await self.db.execute(
                select(CardPack, self._my_rating_subquery(user_id))
                .join(SavedCardPack, SavedCardPack.card_pack_id == CardPack.id)
                .where(*base_where)
                .order_by(SavedCardPack.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()

        packs = []
        for pack, my_rating in rows:
            pack.is_saved = True
            pack.my_rating = my_rating
            packs.append(pack)

        return packs, total

    async def list_deleted(
        self,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
    ) -> tuple[list[CardPack], int]:
        # Own deleted packs — is_saved/my_rating are always False/None (schema defaults)
        base_where = [
            CardPack.author_id == user_id,
            CardPack.deleted_at.is_not(None),
        ]

        total: int = (
            await self.db.execute(
                select(func.count(CardPack.id)).select_from(CardPack).where(*base_where)
            )
        ).scalar_one()

        items = (
            await self.db.execute(
                select(CardPack)
                .where(*base_where)
                .order_by(CardPack.deleted_at.desc())
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
        type_id: uuid.UUID | None = None,
        scope: CardPackSearchScope = CardPackSearchScope.available,
        sort_by: SortOrder = SortOrder.newest,
    ) -> tuple[list[CardPack], int]:
        saved_exists = (
            select(SavedCardPack.card_pack_id)
            .where(
                SavedCardPack.user_id == user_id,
                SavedCardPack.card_pack_id == CardPack.id,
            )
            .exists()
        )
        public_active = and_(
            CardPack.is_public.is_(True),
            CardPack.status == StatusEnum.ACTIVE.value,
        )

        base_where = [CardPack.deleted_at.is_(None)]

        if scope == CardPackSearchScope.my:
            base_where.append(CardPack.author_id == user_id)
        elif scope == CardPackSearchScope.public:
            base_where.append(public_active)
        elif scope == CardPackSearchScope.saved:
            base_where.append(saved_exists)
        else:  # available
            base_where.append(
                or_(
                    CardPack.author_id == user_id,
                    public_active,
                    saved_exists,
                )
            )

        if q:
            base_where.append(CardPack.name.ilike(f"%{q}%"))
        if type_id:
            base_where.append(CardPack.type_id == type_id)

        total: int = (
            await self.db.execute(
                select(func.count(CardPack.id)).select_from(CardPack).where(*base_where)
            )
        ).scalar_one()

        rows = (
            await self.db.execute(
                select(
                    CardPack,
                    self._is_saved_subquery(user_id),
                    self._my_rating_subquery(user_id),
                )
                .where(*base_where)
                .order_by(_SORT_COLUMNS[sort_by])
                .limit(limit)
                .offset(offset)
            )
        ).all()

        packs = []
        for pack, is_saved, my_rating in rows:
            pack.is_saved = bool(is_saved)
            pack.my_rating = my_rating
            packs.append(pack)

        return packs, total

    async def get_all_types(self) -> list[CardType]:
        return list(
            (await self.db.execute(select(CardType).order_by(CardType.name))).scalars().all()
        )

