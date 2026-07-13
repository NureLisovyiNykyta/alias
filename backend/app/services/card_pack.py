import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardPackRating, CardType, SavedCardPack
from app.models.enums import StatusEnum
from app.repositories.card_pack_repository import CardPackRepository
from app.schemas.card_pack import CardPackCreate, CardPackSearchScope, CardPackUpdate, SortOrder
from app.services.card import validate_pack_for_activation


async def _get_pack_or_404(db: AsyncSession, pack_id: uuid.UUID) -> CardPack:
    pack = await CardPackRepository(db).get_by_id(pack_id)
    if pack is None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)
    return pack


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


async def get_pack_by_id(
    db: AsyncSession,
    pack_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> CardPack:
    repo = CardPackRepository(db)
    pack = await repo.get_by_id_with_relations(pack_id)

    if pack is None or pack.deleted_at is not None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)

    is_public_active = pack.is_public and pack.status == StatusEnum.ACTIVE.value
    is_author = user_id is not None and pack.author_id == user_id

    if not is_public_active and not is_author:
        raise ForbiddenError()

    if user_id is not None:
        pack.is_saved, pack.my_rating = await repo.get_user_meta(pack_id, user_id)

    return pack


async def create_card_pack(
    db: AsyncSession,
    author_id: uuid.UUID,
    data: CardPackCreate,
) -> CardPack:
    if (await db.execute(select(CardType).where(CardType.id == data.type_id))).scalar_one_or_none() is None:
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

    for field, value in data.model_dump(exclude_unset=True).items():
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

    return await CardPackRepository(db).get_by_id_with_relations(pack_id)


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

    existing = (
        await db.execute(
            select(SavedCardPack).where(
                SavedCardPack.user_id == user_id,
                SavedCardPack.card_pack_id == pack_id,
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        await db.delete(existing)
        pack.saves_count = CardPack.saves_count - 1
        await db.commit()
        return False

    db.add(SavedCardPack(user_id=user_id, card_pack_id=pack_id))
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

    existing_rating = (
        await db.execute(
            select(CardPackRating).where(
                CardPackRating.user_id == user_id,
                CardPackRating.card_pack_id == pack_id,
            )
        )
    ).scalar_one_or_none()

    if existing_rating is not None:
        existing_rating.score = score
    else:
        db.add(CardPackRating(user_id=user_id, card_pack_id=pack_id, score=score))
        pack.rating_count = CardPack.rating_count + 1

    await db.flush()

    avg_score = (
        await db.execute(
            select(func.avg(CardPackRating.score)).where(CardPackRating.card_pack_id == pack_id)
        )
    ).scalar()
    pack.rating_average = float(avg_score) if avg_score else 0.0

    await db.commit()
    await db.refresh(pack)
    return pack


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


# --- thin delegators to repository ---

async def get_deleted_packs(
    db: AsyncSession, user_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[CardPack], int]:
    return await CardPackRepository(db).list_deleted(user_id, limit, offset)


async def get_public_packs(
    db: AsyncSession,
    limit: int,
    offset: int,
    q: str | None = None,
    type_id: uuid.UUID | None = None,
    sort_by: SortOrder = SortOrder.newest,
    user_id: uuid.UUID | None = None,
) -> tuple[list[CardPack], int]:
    return await CardPackRepository(db).list_public(limit, offset, q, type_id, sort_by, user_id)


async def get_my_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    status: StatusEnum | None = None,
) -> tuple[list[CardPack], int]:
    return await CardPackRepository(db).list_my(user_id, limit, offset, q, status)


async def get_saved_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
) -> tuple[list[CardPack], int]:
    return await CardPackRepository(db).list_saved(user_id, limit, offset, q)


async def search_card_packs(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    type_id: uuid.UUID | None = None,
    scope: CardPackSearchScope = CardPackSearchScope.available,
    sort_by: SortOrder = SortOrder.newest,
) -> tuple[list[CardPack], int]:
    return await CardPackRepository(db).search(user_id, limit, offset, q, type_id, scope, sort_by)


async def get_all_card_types(db: AsyncSession) -> list[CardType]:
    return await CardPackRepository(db).get_all_types()
