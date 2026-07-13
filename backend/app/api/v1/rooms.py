from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_current_user_optional, get_game_repo, get_game_service, get_room_service
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import RoomStateJSON
from app.schemas.room import CreateRoomRequest, JoinRoomRequest, LeaveRoomRequest, RoomStatusResponse
from app.services.game import GameService
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
    game_service: GameService = Depends(get_game_service),
) -> RoomStateJSON:
    return await service.leave_room(room_code, current_user, body.guest_id, game_service)


@router.post("/{room_code}/close", status_code=204)
async def close_room(
    room_code: str,
    current_user: User = Depends(get_current_user),
    service: RoomService = Depends(get_room_service),
) -> None:
    await service.close_room(room_code, current_user.id)


@router.get("/{room_code}/status", response_model=RoomStatusResponse)
async def get_room_status(
    room_code: str,
    game_repo: GameRepository = Depends(get_game_repo),
) -> RoomStatusResponse:
    room = await game_repo.get_room(room_code)
    if room is None:
        return RoomStatusResponse(exists=False, status=None)
    return RoomStatusResponse(exists=True, status=room.status)


@router.post("/{room_code}/start", response_model=RoomStateJSON)
async def start_game(
    room_code: str,
    current_user: User = Depends(get_current_user),
    service: RoomService = Depends(get_room_service),
) -> RoomStateJSON:
    return await service.start_game(room_code, current_user.id)
