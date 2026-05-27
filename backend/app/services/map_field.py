import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.map import Map, MapField
from app.schemas.map_field import BulkMapFieldSync


def check_map_ready_for_active(current_count: int, max_count: int) -> None:
    if current_count != max_count:
        raise BadRequestError(ErrorMessage.MAP_READY_FIELDS_COUNT.format(max_count=max_count))


async def validate_map_for_activation(
    db: AsyncSession,
    map_id: uuid.UUID,
    max_fields_count: int,
) -> None:

    count: int = (
        await db.execute(select(func.count(MapField.id)).where(MapField.map_id == map_id))
    ).scalar_one()

    check_map_ready_for_active(count, max_fields_count)


async def sync_map_fields(
    db: AsyncSession,
    user_id: uuid.UUID,
    map_id: uuid.UUID,
    data: BulkMapFieldSync,
) -> list[MapField]:
    result = await db.execute(
        select(Map).where(Map.id == map_id)
    )
    map_obj: Map | None = result.scalar_one_or_none()
    if map_obj is None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)

    if map_obj.author_id != user_id:
        raise ForbiddenError()

    indices = [f.position_index for f in data.fields]
    if len(set(indices)) != len(indices):
        raise BadRequestError(ErrorMessage.MAP_FIELD_DUPLICATE_POSITIONS)
    if any(i >= map_obj.max_fields_count for i in indices):
        raise BadRequestError(ErrorMessage.MAP_FIELD_INDEX_OUT_OF_BOUNDS)

    if map_obj.status == StatusEnum.ACTIVE.value:
        check_map_ready_for_active(
            len(data.fields),
            map_obj.max_fields_count,
        )

    incoming_pack_ids = {f.card_pack_id for f in data.fields if f.card_pack_id is not None}
    if incoming_pack_ids:
        if map_obj.is_public:
            visibility_condition = CardPack.is_public.is_(True)
            error = ErrorMessage.MAP_FIELD_PUBLIC_MAP_PRIVATE_PACK
        else:
            visibility_condition = (CardPack.is_public.is_(True)) | (CardPack.author_id == user_id)
            error = ErrorMessage.MAP_FIELD_INACCESSIBLE_CARD_PACK

        accessible = (
            await db.execute(
                select(CardPack.id).where(
                    CardPack.id.in_(incoming_pack_ids),
                    CardPack.deleted_at.is_(None),
                    visibility_condition,
                )
            )
        ).scalars().all()
        if len(set(accessible)) != len(incoming_pack_ids):
            raise BadRequestError(error)

    existing_fields = (
        await db.execute(select(MapField).where(MapField.map_id == map_id))
    ).scalars().all()

    existing_map: dict[uuid.UUID, MapField] = {f.id: f for f in existing_fields}
    existing_ids = set(existing_map.keys())
    incoming_ids = {f.id for f in data.fields if f.id is not None}

    for field_id in existing_ids - incoming_ids:
        await db.delete(existing_map[field_id])

    for item in data.fields:
        if item.id is not None and item.id in existing_ids:
            field = existing_map[item.id]
            field.position_index = item.position_index
            field.time_limit = item.time_limit
            field.award = item.award
            field.penalty = item.penalty
            field.card_pack_id = item.card_pack_id
        elif item.id is None:
            db.add(
                MapField(
                    map_id=map_id,
                    position_index=item.position_index,
                    time_limit=item.time_limit,
                    award=item.award,
                    penalty=item.penalty,
                    card_pack_id=item.card_pack_id,
                )
            )
        else:
            raise BadRequestError(ErrorMessage.MAP_FIELD_NOT_FOUND_IN_MAP.format(field_id=item.id))

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise BadRequestError(ErrorMessage.MAP_FIELD_INVALID_CARD_PACK)

    updated = (
        await db.execute(
            select(MapField)
            .options(joinedload(MapField.card_pack))
            .where(MapField.map_id == map_id)
            .order_by(MapField.position_index)
        )
    ).scalars().all()
    return list(updated)


async def get_fields_by_map(
    db: AsyncSession,
    map_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> list[MapField]:
    result = await db.execute(select(Map).where(Map.id == map_id))
    map_obj: Map | None = result.scalar_one_or_none()
    if map_obj is None:
        raise NotFoundError(ErrorMessage.MAP_NOT_FOUND)

    is_publicly_visible = map_obj.is_public and map_obj.status == StatusEnum.ACTIVE.value and map_obj.deleted_at is None
    if not is_publicly_visible and map_obj.author_id != user_id:
        raise ForbiddenError()

    fields = (
        await db.execute(
            select(MapField)
            .options(joinedload(MapField.card_pack))
            .where(MapField.map_id == map_id)
            .order_by(MapField.position_index)
        )
    ).scalars().all()
    return list(fields)
