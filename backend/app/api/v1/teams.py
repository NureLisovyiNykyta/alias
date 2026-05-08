import uuid

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_current_user_optional, get_team_service
from app.models.user import User
from app.schemas.game_room import Team
from app.schemas.room import CreateTeamRequest, TeamPlayerRequest, UpdateTeamRequest
from app.services.team import TeamService

router = APIRouter(prefix="/api/rooms/{room_code}/teams", tags=["teams"])


@router.post("", response_model=Team, status_code=201)
async def create_team(
    room_code: str,
    body: CreateTeamRequest,
    current_user: User = Depends(get_current_user),
    service: TeamService = Depends(get_team_service),
) -> Team:
    return await service.create_team(room_code, body.name, body.color, current_user.id)


@router.patch("/{team_id}", response_model=Team)
async def update_team(
    room_code: str,
    team_id: uuid.UUID,
    body: UpdateTeamRequest,
    current_user: User = Depends(get_current_user),
    service: TeamService = Depends(get_team_service),
) -> Team:
    return await service.update_team(room_code, team_id, body.name, body.color, current_user.id)


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    room_code: str,
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: TeamService = Depends(get_team_service),
) -> None:
    await service.delete_team(room_code, team_id, current_user.id)


@router.post("/{team_id}/join", status_code=204)
async def join_team(
    room_code: str,
    team_id: uuid.UUID,
    body: TeamPlayerRequest,
    current_user: User | None = Depends(get_current_user_optional),
    service: TeamService = Depends(get_team_service),
) -> None:
    await service.join_team(room_code, team_id, current_user, body.guest_id)


@router.post("/{team_id}/leave", status_code=204)
async def leave_team(
    room_code: str,
    team_id: uuid.UUID,
    body: TeamPlayerRequest,
    current_user: User | None = Depends(get_current_user_optional),
    service: TeamService = Depends(get_team_service),
) -> None:
    await service.leave_team(room_code, team_id, current_user, body.guest_id)


@router.delete("/{team_id}/players/{player_id}", status_code=204)
async def kick_from_team(
    room_code: str,
    team_id: uuid.UUID,
    player_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: TeamService = Depends(get_team_service),
) -> None:
    await service.kick_from_team(room_code, team_id, player_id, current_user.id)
