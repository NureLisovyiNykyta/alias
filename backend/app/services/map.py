import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.map import MAP_SIZE_FIELDS, Map, MapField, MapRating, MapTheme, SavedMap
from app.repositories.map_repository import MapRepository
from app.schemas.card_pack import SortOrder
from app.schemas.map import MapCreate, MapSearchScope, MapUpdate
from app.services.map_field import validate_map_for_activation


async def _get_map_or_404(db: AsyncSession, map_id: uuid.UUID) -> Map:
    map_obj = await MapRepository(db).get_by_id(map_id)
    if map_obj is None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)
    return map_obj


async def update_map_cover(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
    cover_url: str | None,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)
    if map_obj.author_id != user_id:
        raise ForbiddenError()
    map_obj.cover_url = cover_url
    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def get_map_by_id(
    db: AsyncSession,
    map_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> Map:
    repo = MapRepository(db)
    map_obj = await repo.get_by_id_with_author(map_id)

    if map_obj is None or map_obj.deleted_at is not None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)

    is_public_active = map_obj.is_public and map_obj.status == StatusEnum.ACTIVE.value
    is_author = user_id is not None and map_obj.author_id == user_id

    if not is_public_active and not is_author:
        raise ForbiddenError()

    if user_id is not None:
        map_obj.is_saved, map_obj.my_rating = await repo.get_user_meta(map_id, user_id)

    return map_obj


async def create_map(
    db: AsyncSession,
    author_id: uuid.UUID,
    data: MapCreate,
) -> Map:
    size = data.size.upper()
    if size not in MAP_SIZE_FIELDS:
        raise BadRequestError(ErrorMessage.MAP_INVALID_SIZE)

    map_obj = Map(
        id=uuid.uuid4(),
        name=data.name,
        is_public=False,
        size=size,
        max_fields_count=MAP_SIZE_FIELDS[size],
        author_id=author_id,
        status=StatusEnum.DRAFT.value,
    )
    db.add(map_obj)
    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def update_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
    data: MapUpdate,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id != user_id:
        raise ForbiddenError()

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(map_obj, field, value)

    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def publish_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id != user_id:
        raise ForbiddenError()
    if map_obj.deleted_at is not None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)
    if map_obj.is_public:
        raise BadRequestError(ErrorMessage.MAP_ALREADY_PUBLISHED)
    if map_obj.status != StatusEnum.ACTIVE.value:
        raise BadRequestError(ErrorMessage.MAP_NOT_ACTIVE_FOR_PUBLISH)

    private_pack_exists = (
        await db.execute(
            select(MapField.id)
            .join(CardPack, CardPack.id == MapField.card_pack_id)
            .where(
                MapField.map_id == map_id,
                MapField.card_pack_id.is_not(None),
                CardPack.is_public.is_(False),
            )
            .limit(1)
        )
    ).scalar_one_or_none()

    if private_pack_exists is not None:
        raise BadRequestError(ErrorMessage.MAP_PUBLISH_PRIVATE_PACKS)

    map_obj.is_public = True
    await db.commit()

    return await MapRepository(db).get_by_id_with_author(map_id)


async def activate_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id != user_id:
        raise ForbiddenError()
    if map_obj.status == StatusEnum.ACTIVE.value:
        return map_obj

    await validate_map_for_activation(db, map_id, map_obj.max_fields_count)

    map_obj.status = StatusEnum.ACTIVE.value
    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def toggle_save_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
) -> bool:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id == user_id:
        raise BadRequestError(ErrorMessage.MAP_SAVE_OWN)

    existing = (
        await db.execute(
            select(SavedMap).where(SavedMap.user_id == user_id, SavedMap.map_id == map_id)
        )
    ).scalar_one_or_none()

    if existing is not None:
        await db.delete(existing)
        map_obj.saves_count = Map.saves_count - 1
        await db.commit()
        return False

    db.add(SavedMap(user_id=user_id, map_id=map_id))
    map_obj.saves_count = Map.saves_count + 1
    await db.commit()
    return True


async def set_map_rating(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
    score: int,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id == user_id:
        raise BadRequestError(ErrorMessage.MAP_RATE_OWN)

    existing_rating = (
        await db.execute(
            select(MapRating).where(MapRating.user_id == user_id, MapRating.map_id == map_id)
        )
    ).scalar_one_or_none()

    if existing_rating is not None:
        existing_rating.score = score
    else:
        db.add(MapRating(user_id=user_id, map_id=map_id, score=score))
        map_obj.rating_count = Map.rating_count + 1

    await db.flush()

    avg_score = (
        await db.execute(select(func.avg(MapRating.score)).where(MapRating.map_id == map_id))
    ).scalar()
    map_obj.rating_average = float(avg_score) if avg_score else 0.0

    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def delete_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id != user_id:
        raise ForbiddenError()
    if map_obj.deleted_at is not None:
        raise BadRequestError(ErrorMessage.MAP_ALREADY_DELETED)

    map_obj.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(map_obj)
    return map_obj


async def restore_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
) -> Map:
    map_obj = await _get_map_or_404(db, map_id)

    if map_obj.author_id != user_id:
        raise ForbiddenError()
    if map_obj.deleted_at is None:
        raise BadRequestError(ErrorMessage.MAP_NOT_IN_TRASH)

    map_obj.deleted_at = None
    await db.commit()
    await db.refresh(map_obj)
    return map_obj


# --- thin delegators to repository ---

async def get_deleted_maps(
    db: AsyncSession, user_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[Map], int]:
    return await MapRepository(db).list_deleted(user_id, limit, offset)


async def get_public_maps(
    db: AsyncSession,
    limit: int,
    offset: int,
    q: str | None = None,
    size: str | None = None,
    sort_by: SortOrder = SortOrder.newest,
    user_id: uuid.UUID | None = None,
) -> tuple[list[Map], int]:
    return await MapRepository(db).list_public(limit, offset, q, size, sort_by, user_id)


async def get_my_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    status: StatusEnum | None = None,
) -> tuple[list[Map], int]:
    return await MapRepository(db).list_my(user_id, limit, offset, q, status)


async def get_saved_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
) -> tuple[list[Map], int]:
    return await MapRepository(db).list_saved(user_id, limit, offset, q)


async def search_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    size: str | None = None,
    scope: MapSearchScope = MapSearchScope.available,
    sort_by: SortOrder = SortOrder.newest,
) -> tuple[list[Map], int]:
    return await MapRepository(db).search(user_id, limit, offset, q, size, scope, sort_by)


async def get_all_map_themes(db: AsyncSession) -> list[MapTheme]:
    return await MapRepository(db).get_all_themes()
