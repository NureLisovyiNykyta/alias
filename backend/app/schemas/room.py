import uuid

from pydantic import BaseModel

from app.schemas.game_room import TeamColor


class CreateRoomRequest(BaseModel):
    room_name: str
    map_id: uuid.UUID


class JoinRoomRequest(BaseModel):
    room_code: str
    nickname: str | None = None
    avatar_url: str | None = None
    guest_id: uuid.UUID | None = None


class LeaveRoomRequest(BaseModel):
    guest_id: uuid.UUID | None = None


class CreateTeamRequest(BaseModel):
    name: str
    color: TeamColor


class UpdateTeamRequest(BaseModel):
    name: str | None = None
    color: TeamColor | None = None


class TeamPlayerRequest(BaseModel):
    guest_id: uuid.UUID | None = None
