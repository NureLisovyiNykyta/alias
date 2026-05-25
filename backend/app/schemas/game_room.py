import uuid
from enum import StrEnum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.user import User


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class CardStatus(StrEnum):
    GUESSED = "GUESSED"
    FAILED = "FAILED"
    UNPLAYED = "UNPLAYED"


class TeamColor(StrEnum):
    GREEN = "GREEN"
    BLUE = "BLUE"
    PURPLE = "PURPLE"
    PINK = "PINK"
    RED = "RED"
    YELLOW = "YELLOW"
    ORANGE = "BROWN"
    CYAN = "CYAN"


class RoomStatus(StrEnum):
    LOBBY = "LOBBY"
    PLAYING = "PLAYING"
    FINISHED = "FINISHED"


class TurnPhase(StrEnum):
    PREPARE = "PREPARE"
    GUESSING = "GUESSING"
    REVIEW = "REVIEW"


# ---------------------------------------------------------------------------
# Leaf models
# ---------------------------------------------------------------------------


class Settings(BaseModel):
    min_teams: int = Field(default=2)
    max_teams: int = Field(default=4)
    players_per_team_min: int = Field(default=2)
    players_per_team_max: int = Field(default=4)


class CardPackInfo(BaseModel):
    card_pack_id: UUID
    name: str
    core_mechanic: str
    description: str


class Player(BaseModel):
    user_id: UUID
    nickname: str
    avatar_url: str | None = None
    is_online: bool
    team_id: UUID | None = None

    @classmethod
    def create_from_user(cls, user: "User") -> "Player":
        return cls(
            user_id=user.id,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            is_online=False,
            team_id=None,
        )

    @classmethod
    def create_guest(
        cls,
        guest_id: uuid.UUID,
        nickname: str | None,
        avatar_url: str | None,
    ) -> "Player":
        return cls(
            user_id=guest_id,
            nickname=nickname or "Guest",
            avatar_url=avatar_url,
            is_online=False,
            team_id=None,
        )

    def update_profile_from(self, other: "Player") -> None:
        self.nickname = other.nickname
        self.avatar_url = other.avatar_url


class Team(BaseModel):
    team_id: UUID
    name: str
    color: TeamColor
    current_position: int
    player_ids: list[UUID]


class MapField(BaseModel):
    position_index: int
    time_limit: int
    award: int
    penalty: int
    card_pack_id: UUID


class MapInfo(BaseModel):
    map_id: UUID
    name: str
    max_fields_count: int
    url_3d_model: str
    fields: dict[int, MapField]


class RoundCard(BaseModel):
    card_id: UUID
    content: dict[str, Any]
    status: CardStatus


class CurrentTurn(BaseModel):
    team_id: UUID
    explainer_id: UUID
    phase: TurnPhase
    ends_at: float
    round_cards: list[RoundCard]


# ---------------------------------------------------------------------------
# Root model (Redis key: room:code)
# ---------------------------------------------------------------------------


class RoomStateJSON(BaseModel):
    room_code: str
    name: str
    host_id: UUID
    status: RoomStatus

    settings: Settings
    map_info: MapInfo
    current_turn: CurrentTurn | None = None

    teams: dict[UUID, Team]
    players: dict[UUID, Player]
    card_packs_info: dict[UUID, CardPackInfo]
    card_queues: dict[UUID, list[UUID]]
