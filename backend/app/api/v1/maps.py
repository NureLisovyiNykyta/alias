import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_current_user_optional, get_db
from app.models.enums import StatusEnum
from app.models.map import Map
from app.models.user import User
from app.schemas.base import PaginatedResponse
from app.schemas.card_pack import SortOrder
from app.schemas.map import MapCreate, MapRatingInput, MapRead, MapReadDetailed, MapUpdate
from app.services.map import (
    activate_map,
    create_map,
    delete_map,
    get_deleted_maps,
    get_map_by_id,
    get_my_maps,
    get_public_maps,
    get_saved_maps,
    publish_map,
    restore_map,
    set_map_rating,
    toggle_save_map,
    update_map,
)

router = APIRouter(prefix="/api/maps", tags=["maps"])


@router.post("/", response_model=MapRead)
async def create_map_route(
    body: MapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await create_map(db, current_user.id, body)


@router.patch("/{map_id}", response_model=MapRead)
async def update_map_route(
    map_id: uuid.UUID,
    body: MapUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await update_map(db, current_user.id, map_id, body)


@router.post("/{map_id}/publish", response_model=MapReadDetailed)
async def publish_map_route(
    map_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await publish_map(db, current_user.id, map_id)


@router.post("/{map_id}/activate", response_model=MapRead)
async def activate_map_route(
    map_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await activate_map(db, current_user.id, map_id)


@router.post("/{map_id}/restore", response_model=MapRead)
async def restore_map_route(
    map_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await restore_map(db, current_user.id, map_id)


@router.delete("/{map_id}", response_model=MapRead)
async def delete_map_route(
    map_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await delete_map(db, current_user.id, map_id)


@router.post("/{map_id}/save")
async def save_map_route(
    map_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    saved = await toggle_save_map(db, current_user.id, map_id)
    return {"saved": saved}


@router.post("/{map_id}/rate", response_model=MapRead)
async def rate_map_route(
    map_id: uuid.UUID,
    body: MapRatingInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await set_map_rating(db, current_user.id, map_id, body.score)


@router.get("/public", response_model=PaginatedResponse[MapRead])
async def list_public_maps(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    template_id: uuid.UUID | None = Query(default=None),
    sort_by: SortOrder = Query(default=SortOrder.newest),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MapRead]:
    items, total = await get_public_maps(db, limit, offset, q, template_id, sort_by)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/me", response_model=PaginatedResponse[MapRead])
async def list_my_maps(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    status: StatusEnum | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MapRead]:
    items, total = await get_my_maps(db, current_user.id, limit, offset, q, status)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/saved", response_model=PaginatedResponse[MapRead])
async def list_saved_maps(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MapRead]:
    items, total = await get_saved_maps(db, current_user.id, limit, offset, q)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/trash", response_model=PaginatedResponse[MapRead])
async def list_trash_maps(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MapRead]:
    items, total = await get_deleted_maps(db, current_user.id, limit, offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{map_id}", response_model=MapReadDetailed)
async def get_map_route(
    map_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> Map:
    return await get_map_by_id(db, map_id, current_user.id if current_user else None)
