import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_current_user_optional, get_db
from app.models.map import MapField
from app.models.user import User
from app.schemas.map_field import BulkMapFieldSync, MapFieldRead
from app.services.map_field import get_fields_by_map, sync_map_fields

router = APIRouter(prefix="/api/maps", tags=["map-fields"])


@router.get("/{map_id}/fields", response_model=list[MapFieldRead])
async def list_fields(
    map_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> list[MapField]:
    return await get_fields_by_map(db, map_id, current_user.id if current_user else None)


@router.put("/{map_id}/fields", response_model=list[MapFieldRead])
async def bulk_sync_fields(
    map_id: uuid.UUID,
    body: BulkMapFieldSync,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MapField]:
    return await sync_map_fields(db, current_user.id, map_id, body)
