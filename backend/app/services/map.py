import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.enums import StatusEnum
from app.models.map import Map, MapRating, MapTemplate, SavedMap
from app.schemas.card_pack import SortOrder
from app.schemas.map import MapCreate, MapUpdate
from app.services.map_field import validate_map_for_activation


async def _get_map_or_404(db: AsyncSession, map_id: uuid.UUID) -> Map:
    result = await db.execute(select(Map).where(Map.id == map_id))
    map_obj: Map | None = result.scalar_one_or_none()
    if map_obj is None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)
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
        is_public=data.is_public,
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


async def get_public_maps(
    db: AsyncSession,
    limit: int,
    offset: int,
    q: str | None = None,
    template_id: uuid.UUID | None = None,
    sort_by: SortOrder = SortOrder.newest,
) -> tuple[list[Map], int]:
    base_where = [
        Map.is_public.is_(True),
        Map.is_deleted.is_(False),
        Map.status == StatusEnum.ACTIVE.value,
    ]
    if q:
        base_where.append(Map.name.ilike(f"%{q}%"))
    if template_id:
        base_where.append(Map.template_id == template_id)

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
        Map.is_deleted.is_(False),
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
        Map.is_deleted.is_(False),
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
