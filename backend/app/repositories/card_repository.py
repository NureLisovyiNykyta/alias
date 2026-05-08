import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.card import Card


class CardRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_cards_for_packs(
        self, pack_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, list[uuid.UUID]]:
        result = await self.db.execute(
            select(Card.id, Card.card_pack_id).where(Card.card_pack_id.in_(pack_ids))
        )
        rows = result.all()

        cards_by_pack: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
        for card_id, pack_id in rows:
            cards_by_pack[pack_id].append(card_id)

        return dict(cards_by_pack)
