import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_current_user_optional, get_db
from app.models.card import CardPack
from app.models.enums import StatusEnum
from app.models.user import User
from app.schemas.base import PaginatedResponse
from app.schemas.card_pack import CardPackCreate, CardPackRatingInput, CardPackRead, CardPackReadDetailed, CardPackSearchScope, CardPackUpdate, CardTypeRead, SortOrder
from app.services import images as image_service
from app.services.card_pack import (
    activate_card_pack,
    create_card_pack,
    delete_pack,
    get_all_card_types,
    get_deleted_packs,
    get_my_packs,
    get_pack_by_id,
    get_public_packs,
    search_card_packs,
    get_saved_packs,
    publish_pack,
    restore_pack,
    set_card_pack_rating,
    toggle_save_card_pack,
    update_card_pack,
    update_card_pack_cover,
)

router = APIRouter(prefix="/api/card-packs", tags=["card-packs"])


@router.get("/types", response_model=list[CardTypeRead])
async def list_card_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    return await get_all_card_types(db)


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


@router.post("/{pack_id}/publish", response_model=CardPackReadDetailed)
async def publish_pack_route(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await publish_pack(db, current_user.id, pack_id)


@router.post("/{pack_id}/activate", response_model=CardPackRead)
async def activate_pack(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await activate_card_pack(db, current_user.id, pack_id)


@router.post("/{pack_id}/restore", response_model=CardPackRead)
async def restore_pack_route(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await restore_pack(db, current_user.id, pack_id)


@router.delete("/{pack_id}", response_model=CardPackRead)
async def delete_pack_route(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await delete_pack(db, current_user.id, pack_id)


@router.post("/{pack_id}/cover", response_model=CardPackRead)
async def upload_pack_cover(
    pack_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    url = await image_service.upload_cover(file, "card-packs", pack_id)
    return await update_card_pack_cover(db, current_user.id, pack_id, url)


@router.delete("/{pack_id}/cover", response_model=CardPackRead)
async def delete_pack_cover(
    pack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    pack = await update_card_pack_cover(db, current_user.id, pack_id, None)
    await image_service.delete_cover("card-packs", pack_id)
    return pack


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
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await get_public_packs(
        db,
        limit,
        offset,
        q,
        type_id,
        sort_by,
        current_user.id if current_user else None,
    )
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


@router.get("/trash", response_model=PaginatedResponse[CardPackRead])
async def list_trash_packs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await get_deleted_packs(db, current_user.id, limit, offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/search", response_model=PaginatedResponse[CardPackRead])
async def search_packs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    type_id: uuid.UUID | None = Query(default=None),
    scope: CardPackSearchScope = Query(default=CardPackSearchScope.available),
    sort_by: SortOrder = Query(default=SortOrder.newest),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CardPackRead]:
    items, total = await search_card_packs(
        db,
        current_user.id,
        limit,
        offset,
        q,
        type_id,
        scope,
        sort_by,
    )
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{pack_id}", response_model=CardPackReadDetailed)
async def get_pack_route(
    pack_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> CardPack:
    return await get_pack_by_id(db, pack_id, current_user.id if current_user else None)
