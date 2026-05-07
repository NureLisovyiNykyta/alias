from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_current_user_optional, get_room_service
from app.models.user import User
from app.schemas.game_room import RoomStateJSON
from app.schemas.room import CreateRoomRequest, JoinRoomRequest, LeaveRoomRequest
from app.services.room import RoomService

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("/create", response_model=RoomStateJSON)
async def create_room(
    body: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    service: RoomService = Depends(get_room_service),
) -> RoomStateJSON:
    return await service.create_room(body, current_user)


@router.post("/join", response_model=RoomStateJSON)
async def join_room(
    body: JoinRoomRequest,
    current_user: User | None = Depends(get_current_user_optional),
    service: RoomService = Depends(get_room_service),
) -> RoomStateJSON:
    return await service.join_room(body, current_user)


@router.post("/{room_code}/leave", response_model=RoomStateJSON)
async def leave_room(
    room_code: str,
    body: LeaveRoomRequest,
    current_user: User | None = Depends(get_current_user_optional),
    service: RoomService = Depends(get_room_service),
) -> RoomStateJSON:
    return await service.leave_room(room_code, current_user, body.guest_id)


@router.post("/{room_code}/close", status_code=204)
async def close_room(
    room_code: str,
    current_user: User = Depends(get_current_user),
    service: RoomService = Depends(get_room_service),
) -> None:
    await service.close_room(room_code, current_user.id)


@router.post("/{room_code}/start", response_model=RoomStateJSON)
async def start_game(
    room_code: str,
    current_user: User = Depends(get_current_user),
    service: RoomService = Depends(get_room_service),
) -> RoomStateJSON:
    return await service.start_game(room_code, current_user.id)
