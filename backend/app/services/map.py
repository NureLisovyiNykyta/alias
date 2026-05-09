import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.enums import StatusEnum
from app.models.card import CardPack
from app.models.map import Map, MapField, MapRating, MapTemplate, SavedMap
from app.schemas.card_pack import SortOrder
from app.schemas.map import MapCreate, MapUpdate
from app.services.map_field import validate_map_for_activation


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


async def _get_map_or_404(db: AsyncSession, map_id: uuid.UUID) -> Map:
    result = await db.execute(select(Map).where(Map.id == map_id))
    map_obj: Map | None = result.scalar_one_or_none()
    if map_obj is None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)
    return map_obj


async def get_map_by_id(
    db: AsyncSession,
    map_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> Map:
    result = await db.execute(
        select(Map)
        .options(joinedload(Map.author), joinedload(Map.template))
        .where(Map.id == map_id)
    )
    map_obj: Map | None = result.scalar_one_or_none()

    if map_obj is None or map_obj.deleted_at is not None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)

    is_public_active = map_obj.is_public and map_obj.status == StatusEnum.ACTIVE.value
    is_author = user_id is not None and map_obj.author_id == user_id

    if not is_public_active and not is_author:
        raise ForbiddenError()

    return map_obj


async def create_map(
    db: AsyncSession,
    author_id: uuid.UUID,
    data: MapCreate,
) -> Map:
    result = await db.execute(select(MapTemplate).where(MapTemplate.id == data.template_id))
    if result.scalar_one_or_none() is None:
        raise NotFoundError(ErrorMessage.MAP_TEMPLATE_NOT_FOUND)

    map_obj = Map(
        id=uuid.uuid4(),
        name=data.name,
        is_public=False,
        template_id=data.template_id,
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

    result = await db.execute(
        select(Map)
        .options(joinedload(Map.author), joinedload(Map.template))
        .where(Map.id == map_id)
    )
    return result.scalar_one()


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

    await validate_map_for_activation(db, map_id, map_obj.template_id)

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

    result = await db.execute(
        select(SavedMap).where(
            SavedMap.user_id == user_id,
            SavedMap.map_id == map_id,
        )
    )
    existing = result.scalar_one_or_none()

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

    result = await db.execute(
        select(MapRating).where(
            MapRating.user_id == user_id,
            MapRating.map_id == map_id,
        )
    )
    existing_rating = result.scalar_one_or_none()

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


_SORT_COLUMNS = {
    SortOrder.newest: Map.created_at.desc(),
    SortOrder.top_rated: Map.rating_average.desc(),
    SortOrder.most_saved: Map.saves_count.desc(),
}


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


async def get_deleted_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
) -> tuple[list[Map], int]:
    base_where = [
        Map.author_id == user_id,
        Map.deleted_at.is_not(None),
    ]

    total: int = (
        await db.execute(select(func.count(Map.id)).select_from(Map).where(*base_where))
    ).scalar_one()

    items = (
        await db.execute(
            select(Map).where(*base_where).order_by(Map.deleted_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_public_maps(
    db: AsyncSession,
    limit: int,
    offset: int,
    q: str | None = None,
    template_id: uuid.UUID | None = None,
    sort_by: SortOrder = SortOrder.newest,
    exclude_user_id: uuid.UUID | None = None,
) -> tuple[list[Map], int]:
    base_where = [
        Map.is_public.is_(True),
        Map.deleted_at.is_(None),
        Map.status == StatusEnum.ACTIVE.value,
    ]
    if q:
        base_where.append(Map.name.ilike(f"%{q}%"))
    if template_id:
        base_where.append(Map.template_id == template_id)
    if exclude_user_id:
        base_where.append(Map.author_id != exclude_user_id)

    total: int = (
        await db.execute(select(func.count(Map.id)).select_from(Map).where(*base_where))
    ).scalar_one()

    items = (
        await db.execute(
            select(Map).where(*base_where).order_by(_SORT_COLUMNS[sort_by]).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_my_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
    status: StatusEnum | None = None,
) -> tuple[list[Map], int]:
    base_where = [
        Map.author_id == user_id,
        Map.deleted_at.is_(None),
    ]
    if q:
        base_where.append(Map.name.ilike(f"%{q}%"))
    if status:
        base_where.append(Map.status == status.value)

    total: int = (
        await db.execute(select(func.count(Map.id)).select_from(Map).where(*base_where))
    ).scalar_one()

    items = (
        await db.execute(
            select(Map).where(*base_where).order_by(Map.created_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_saved_maps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    q: str | None = None,
) -> tuple[list[Map], int]:
    base_where = [
        SavedMap.user_id == user_id,
        Map.deleted_at.is_(None),
    ]
    if q:
        base_where.append(Map.name.ilike(f"%{q}%"))

    total: int = (
        await db.execute(
            select(func.count(Map.id))
            .select_from(Map)
            .join(SavedMap, SavedMap.map_id == Map.id)
            .where(*base_where)
        )
    ).scalar_one()

    items = (
        await db.execute(
            select(Map)
            .join(SavedMap, SavedMap.map_id == Map.id)
            .where(*base_where)
            .order_by(SavedMap.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()

    return list(items), total


async def get_all_map_templates(db: AsyncSession) -> list[MapTemplate]:
    result = await db.execute(select(MapTemplate).order_by(MapTemplate.name))
    return list(result.scalars().all())
