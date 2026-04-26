import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.user import User
from app.schemas.base import PaginatedResponse
from app.schemas.card_pack import CardPackCreate, CardPackRatingInput, CardPackRead, CardPackUpdate, SortOrder
from app.services.card_pack import (
    activate_card_pack,
    create_card_pack,
    get_my_packs,
    get_public_packs,
    get_saved_packs,
    set_card_pack_rating,
    toggle_save_card_pack,
    update_card_pack,
)

router = APIRouter(prefix="/api/card-packs", tags=["card-packs"])


@router.post("/", response_model=CardPackRead)
async def create_pack(
    body: CardPackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await create_card_pack(db, current_user.id, body)


@router.patch("/{pack_id}", response_model=CardPackRead)
async def update_pack(
    pack_id: uuid.UUID,
    body: CardPackUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await update_card_pack(db, current_user.id, pack_id, body)


@router.post("/{pack_id}/activate", response_model=CardPackRead)
async def activate_pack(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await activate_card_pack(db, current_user.id, pack_id)



@router.post("/{pack_id}/save")
async def save_pack(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    saved = await toggle_save_card_pack(db, current_user.id, pack_id)
    return {"saved": saved}


@router.post("/{pack_id}/rate", response_model=CardPackRead)
async def rate_pack(
    pack_id: uuid.UUID,
    body: CardPackRatingInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await set_card_pack_rating(db, current_user.id, pack_id, body.score)


@router.get("/public", response_model=PaginatedResponse[CardPackRead])
async def list_public_packs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    type_id: uuid.UUID | None = Query(default=None),
    sort_by: SortOrder = Query(default=SortOrder.newest),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await get_public_packs(db, limit, offset, q, type_id, sort_by)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/me", response_model=PaginatedResponse[CardPackRead])
async def list_my_packs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    status: StatusEnum | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await get_my_packs(db, current_user.id, limit, offset, q, status)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/saved", response_model=PaginatedResponse[CardPackRead])
async def list_saved_packs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await get_saved_packs(db, current_user.id, limit, offset, q)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)
