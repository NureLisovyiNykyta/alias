import uuid

import jsonschema
import jsonschema.exceptions
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.card import Card, CardPack
from app.models.enums import StatusEnum
from app.schemas.card import BulkCardSync


def check_min_cards_for_active(
    count: int,
    error_msg_template: str = ErrorMessage.CARD_PACK_MIN_CARDS,
) -> None:
    if count < settings.MIN_ACTIVE_CARDS:
        raise BadRequestError(error_msg_template.format(min_cards=settings.MIN_ACTIVE_CARDS))


async def validate_pack_for_activation(db: AsyncSession, pack_id: uuid.UUID) -> None:
    count: int = (
        await db.execute(select(func.count(Card.id)).where(Card.card_pack_id == pack_id))
    ).scalar_one()
    check_min_cards_for_active(count)


async def sync_cards(
    db: AsyncSession,
    user_id: uuid.UUID,
    pack_id: uuid.UUID,
    data: BulkCardSync,
) -> list[Card]:
    result = await db.execute(
        select(CardPack).options(joinedload(CardPack.type)).where(CardPack.id == pack_id)
    )
    pack: CardPack | None = result.scalar_one_or_none()
    if pack is None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)

    if pack.author_id != user_id:
        raise ForbiddenError()

    card_type = pack.type
    if card_type is None:
        raise NotFoundError(ErrorMessage.CARD_TYPE_NOT_FOUND)

    if pack.status == StatusEnum.ACTIVE.value:
        check_min_cards_for_active(len(data.cards), error_msg_template=ErrorMessage.CARD_PACK_ACTIVE_MIN_CARDS)

    validator = jsonschema.Draft7Validator(card_type.schema)
    for item in data.cards:
        try:
            validator.validate(item.content)
        except jsonschema.exceptions.ValidationError as e:
            raise BadRequestError(ErrorMessage.CARD_INVALID_FORMAT.format(detail=e.message))

    existing_cards = (
        await db.execute(select(Card).where(Card.card_pack_id == pack_id))
    ).scalars().all()

    existing_map: dict[uuid.UUID, Card] = {c.id: c for c in existing_cards}
    existing_ids = set(existing_map.keys())
    incoming_ids = {item.id for item in data.cards if item.id is not None}

    for card_id in existing_ids - incoming_ids:
        await db.delete(existing_map[card_id])

    for item in data.cards:
        if item.id is not None and item.id in existing_ids:
            existing_map[item.id].content = item.content
        elif item.id is None:
            db.add(Card(card_pack_id=pack_id, content=item.content))
        else:
            raise BadRequestError(ErrorMessage.CARD_NOT_FOUND_IN_PACK.format(card_id=item.id))

    await db.commit()

    updated = (
        await db.execute(select(Card).where(Card.card_pack_id == pack_id))
    ).scalars().all()
    return list(updated)


async def get_cards_by_pack(
    db: AsyncSession,
    pack_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> list[Card]:
    result = await db.execute(select(CardPack).where(CardPack.id == pack_id))
    pack: CardPack | None = result.scalar_one_or_none()
    if pack is None:
        raise NotFoundError(ErrorMessage.CARD_PACK_NOT_FOUND)

    is_publicly_visible = pack.is_public and pack.status == StatusEnum.ACTIVE.value and pack.deleted_at is None
    if not is_publicly_visible and pack.author_id != user_id:
        raise ForbiddenError()

    cards = (
        await db.execute(select(Card).where(Card.card_pack_id == pack_id))
    ).scalars().all()
    return list(cards)
