import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardPackRating, CardType, SavedCardPack
from app.services.card import validate_pack_for_activation
from app.models.enums import StatusEnum
from app.schemas.card_pack import CardPackCreate, CardPackUpdate, SortOrder


async def update_card_pack_cover(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
    cover_url: str | None,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)
    if pack.author_id != user_id:
        raise ForbiddenError()
    pack.cover_url = cover_url
    await db.commit()
    await db.refresh(pack)
    return pack


async def _get_pack_or_404(db: AsyncSession, pack_id: uuid.UUID) -> CardPack:
    result = await db.execute(select(CardPack).where(CardPack.id == pack_id))
    pack: CardPack | None = result.scalar_one_or_none()
    if pack is None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)
    return pack


async def get_pack_by_id(
    db: AsyncSession,
    pack_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> CardPack:
    result = await db.execute(
        select(CardPack)
        .options(joinedload(CardPack.author), joinedload(CardPack.type))
        .where(CardPack.id == pack_id)
    )
    pack: CardPack | None = result.scalar_one_or_none()

    if pack is None or pack.deleted_at is not None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)

    is_public_active = pack.is_public and pack.status == StatusEnum.ACTIVE.value
    is_author = user_id is not None and pack.author_id == user_id

    if not is_public_active and not is_author:
        raise ForbiddenError()

    return pack


async def create_card_pack(
    db: AsyncSession,
    author_id: uuid.UUID,
    data: CardPackCreate,
) -> CardPack:
    result = await db.execute(select(CardType).where(CardType.id == data.type_id))
    if result.scalar_one_or_none() is None:
        raise NotFoundError(ErrorMessage.CARD_TYPE_NOT_FOUND)

    pack = CardPack(
        id=uuid.uuid4(),
        name=data.name,
        description=data.description,
        is_public=False,
        type_id=data.type_id,
        author_id=author_id,
        status=StatusEnum.DRAFT.value,
    )
    db.add(pack)
    await db.commit()
    await db.refresh(pack)
    return pack


async def update_card_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
    data: CardPackUpdate,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id != user_id:
        raise ForbiddenError()

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pack, field, value)

    await db.commit()
    await db.refresh(pack)
    return pack


async def publish_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id != user_id:
        raise ForbiddenError()

    if pack.deleted_at is not None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)

    if pack.is_public:
        raise BadRequestError(ErrorMessage.CARD_PACK_ALREADY_PUBLISHED)

    if pack.status != StatusEnum.ACTIVE.value:
        raise BadRequestError(ErrorMessage.CARD_PACK_NOT_ACTIVE_FOR_PUBLISH)

    pack.is_public = True
    await db.commit()

    result = await db.execute(
        select(CardPack)
        .options(joinedload(CardPack.author), joinedload(CardPack.type))
        .where(CardPack.id == pack_id)
    )
    return result.scalar_one()


async def activate_card_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id != user_id:
        raise ForbiddenError()

    if pack.status == StatusEnum.ACTIVE.value:
        return pack

    await validate_pack_for_activation(db, pack_id)

    pack.status = StatusEnum.ACTIVE.value
    await db.commit()
    await db.refresh(pack)
    return pack


async def toggle_save_card_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
) -> bool:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id == user_id:
        raise BadRequestError(ErrorMessage.CARD_PACK_SAVE_OWN)

    result = await db.execute(
        select(SavedCardPack).where(
            SavedCardPack.user_id == user_id,
            SavedCardPack.card_pack_id == pack_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        await db.delete(existing)
        pack.saves_count = CardPack.saves_count - 1
        await db.commit()
        return False

    saved = SavedCardPack(user_id=user_id, card_pack_id=pack_id)
    db.add(saved)
    pack.saves_count = CardPack.saves_count + 1
    await db.commit()
    return True


async def set_card_pack_rating(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
    score: int,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id == user_id:
        raise BadRequestError(ErrorMessage.CARD_PACK_RATE_OWN)

    result = await db.execute(
        select(CardPackRating).where(
            CardPackRating.user_id == user_id,
            CardPackRating.card_pack_id == pack_id,
        )
    )
    existing_rating = result.scalar_one_or_none()

    if existing_rating is not None:
        existing_rating.score = score
    else:
        new_rating = CardPackRating(user_id=user_id, card_pack_id=pack_id, score=score)
        db.add(new_rating)
        pack.rating_count = CardPack.rating_count + 1

    await db.flush()

    stmt = select(func.avg(CardPackRating.score)).where(CardPackRating.card_pack_id == pack_id)
    avg_score = (await db.execute(stmt)).scalar()
    pack.rating_average = float(avg_score) if avg_score else 0.0

    await db.commit()
    await db.refresh(pack)
    return pack


_SORT_COLUMNS = {
    SortOrder.newest: CardPack.created_at.desc(),
    SortOrder.top_rated: CardPack.rating_average.desc(),
    SortOrder.most_saved: CardPack.saves_count.desc(),
}


async def delete_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id != user_id:
        raise ForbiddenError()

    if pack.deleted_at is not None:
        raise BadRequestError(ErrorMessage.CARD_PACK_ALREADY_DELETED)

    pack.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(pack)
    return pack


async def restore_pack(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
) -> CardPack:
    pack = await _get_pack_or_404(db, pack_id)

    if pack.author_id != user_id:
        raise ForbiddenError()

    if pack.deleted_at is None:
        raise BadRequestError(ErrorMessage.CARD_PACK_NOT_IN_TRASH)

    pack.deleted_at = None
    await db.commit()
    await db.refresh(pack)
    return pack


async def get_deleted_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
) -> tuple[list[CardPack], int]:
    base_where = [
        CardPack.author_id == user_id,
        CardPack.deleted_at.is_not(None),
    ]

    total: int = (
        await db.execute(select(func.count(CardPack.id)).select_from(CardPack).where(*base_where))
    ).scalar_one()

    items = (
        await db.execute(
            select(CardPack).where(*base_where).order_by(CardPack.deleted_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_public_packs(
    db: AsyncSession,
    limit: int,
    offset: int,
    q: str | None = None,
    type_id: uuid.UUID | None = None,
    sort_by: SortOrder = SortOrder.newest,
    exclude_user_id: uuid.UUID | None = None,
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
    if exclude_user_id:
        base_where.append(CardPack.author_id != exclude_user_id)

    total: int = (await db.execute(select(func.count(CardPack.id)).select_from(CardPack).where(*base_where))).scalar_one()

    items = (
        await db.execute(
            select(CardPack).where(*base_where).order_by(_SORT_COLUMNS[sort_by]).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_my_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    status: StatusEnum | None = None,
) -> tuple[list[CardPack], int]:
    base_where = [
        CardPack.author_id == user_id,
        CardPack.deleted_at.is_(None),
    ]
    if q:
        base_where.append(CardPack.name.ilike(f"%{q}%"))
    if status:
        base_where.append(CardPack.status == status.value)

    total: int = (await db.execute(select(func.count(CardPack.id)).select_from(CardPack).where(*base_where))).scalar_one()

    items = (
        await db.execute(
            select(CardPack).where(*base_where).order_by(CardPack.created_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_saved_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
) -> tuple[list[CardPack], int]:
    base_where = [
        SavedCardPack.user_id == user_id,
        CardPack.deleted_at.is_(None),
    ]
    if q:
        base_where.append(CardPack.name.ilike(f"%{q}%"))

    total: int = (
        await db.execute(
            select(func.count(CardPack.id))
            .select_from(CardPack)
            .join(SavedCardPack, SavedCardPack.card_pack_id == CardPack.id)
            .where(*base_where)
        )
    ).scalar_one()

    items = (
        await db.execute(
            select(CardPack)
            .join(SavedCardPack, SavedCardPack.card_pack_id == CardPack.id)
            .where(*base_where)
            .order_by(SavedCardPack.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_all_card_types(db: AsyncSession) -> list[CardType]:
    result = await db.execute(select(CardType).order_by(CardType.name))
    return list(result.scalars().all())
