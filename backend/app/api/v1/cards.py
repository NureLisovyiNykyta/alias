import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_current_user_optional, get_db
from app.models.card import Card
from app.models.user import User
from app.schemas.card import BulkCardSync, CardRead
from app.services.card import get_cards_by_pack, sync_cards

router = APIRouter(prefix="/api/card-packs", tags=["cards"])


@router.get("/{pack_id}/cards", response_model=list[CardRead])
async def list_cards(
    pack_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> list[Card]:
    return await get_cards_by_pack(db, pack_id, current_user.id if current_user else None)


@router.put("/{pack_id}/cards", response_model=list[CardRead])
async def bulk_sync_cards(
    pack_id: uuid.UUID,
    body: BulkCardSync,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Card]:
    return await sync_cards(db, current_user.id, pack_id, body)
