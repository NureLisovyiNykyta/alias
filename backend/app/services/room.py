import random
import uuid
from typing import cast

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.core.security import generate_room_code
from app.models.card import CardPack
from app.models.map import Map, MapTheme
from app.models.user import User
from app.repositories.card_repository import CardRepository
from app.repositories.game_repository import GameRepository
from app.repositories.map_repository import MapRepository
from app.schemas.game_room import (
    CardPackInfo,
    CurrentTurn,
    MapField,
    MapInfo,
    Player,
    RoomStateJSON,
    RoomStatus,
    Settings,
    ThemeInfo,
    TurnPhase,
)
from app.schemas.room import CreateRoomRequest, JoinRoomRequest
from app.ws.connection_manager import ConnectionManager
from app.ws.events import ServerEvent


class RoomService:
    def __init__(
        self,
        game_repo: GameRepository,
        map_repo: MapRepository,
        card_repo: CardRepository,
        conn_manager: ConnectionManager,
    ) -> None:
        self.game_repo = game_repo
        self.map_repo = map_repo
        self.card_repo = card_repo
        self.conn_manager = conn_manager


    async def create_room(self, request: CreateRoomRequest, host: User) -> RoomStateJSON:
        map_info, card_packs_info, size = await self._load_map_data(request.map_id)
        theme_info = await self._load_theme_info(request.theme_id, size)

        host_player = Player.create_from_user(host)

        while True:
            room = RoomStateJSON(
                room_code=generate_room_code(),
                name=request.room_name,
                host_id=host.id,
                status=RoomStatus.LOBBY,
                settings=Settings(),
                map_info=map_info,
                theme_info=theme_info,
                teams={},
                players={host.id: host_player},
                card_packs_info=card_packs_info,
                card_queues={},
            )
            if await self.game_repo.create_room_if_not_exists(room):
                break

        return room


    async def join_room(self, request: JoinRoomRequest, user: User | None) -> RoomStateJSON:
        room = await self.game_repo.get_room(request.room_code)
        if room is None:
            raise NotFoundError(ErrorMessage.ROOM_NOT_FOUND)

        if room.status != RoomStatus.LOBBY:
            raise BadRequestError(ErrorMessage.ROOM_NOT_IN_LOBBY)

        if user is not None:
            player = Player.create_from_user(user)
        else:
            if request.guest_id is None:
                raise BadRequestError(ErrorMessage.ROOM_GUEST_ID_REQUIRED)
            player = Player.create_guest(request.guest_id, request.nickname, request.avatar_url)

        if player.user_id in room.players:
            room.players[player.user_id].update_profile_from(player)
            await self.game_repo.save_room(room)
            await self.conn_manager.broadcast(room.room_code, ServerEvent.room_state(room))
            return room

        room.players[player.user_id] = player
        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room.room_code, ServerEvent.player_joined(player))
        return room


    async def leave_room(
        self, room_code: str, user: User | None, guest_id: uuid.UUID | None
    ) -> RoomStateJSON:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise NotFoundError(ErrorMessage.ROOM_NOT_FOUND)

        if user is not None:
            player_id = user.id
        else:
            if guest_id is None:
                raise BadRequestError(ErrorMessage.ROOM_GUEST_ID_REQUIRED)
            player_id = guest_id

        if player_id not in room.players:
            raise NotFoundError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        if player_id == room.host_id:
            raise ForbiddenError(ErrorMessage.ROOM_HOST_CANNOT_LEAVE)

        player = room.players.pop(player_id)

        if player.team_id is not None and player.team_id in room.teams:
            team = room.teams[player.team_id]
            if player.user_id in team.player_ids:
                team.player_ids.remove(player.user_id)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room.room_code, ServerEvent.player_left(player_id))
        return room


    async def close_room(self, room_code: str, host_id: uuid.UUID) -> None:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise NotFoundError(ErrorMessage.ROOM_NOT_FOUND)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        await self.conn_manager.broadcast(room_code, ServerEvent.room_closed(room_code))
        await self.game_repo.delete_room(room_code)


    async def start_game(self, room_code: str, host_id: uuid.UUID) -> RoomStateJSON:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise NotFoundError(ErrorMessage.ROOM_NOT_FOUND)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        if room.status != RoomStatus.LOBBY:
            raise BadRequestError(ErrorMessage.ROOM_NOT_IN_LOBBY)

        if not (room.settings.min_teams <= len(room.teams) <= room.settings.max_teams):
            raise BadRequestError(
                ErrorMessage.ROOM_NOT_ENOUGH_TEAMS.format(
                    min=room.settings.min_teams, max=room.settings.max_teams
                )
            )

        for team in room.teams.values():
            size = len(team.player_ids)
            if size < room.settings.players_per_team_min or size > room.settings.players_per_team_max:
                raise BadRequestError(
                    ErrorMessage.ROOM_TEAM_INVALID_SIZE.format(name=team.name)
                )

        pack_ids = list(room.card_packs_info.keys())
        cards_by_pack = await self.card_repo.get_cards_for_packs(pack_ids)
        for pack_id, card_ids in cards_by_pack.items():
            random.shuffle(card_ids)
            room.card_queues[pack_id] = card_ids

        first_team = next(iter(room.teams.values()))
        first_player_id = first_team.player_ids[0]
        room.current_turn = CurrentTurn(
            team_id=first_team.team_id,
            explainer_id=first_player_id,
            explainer_index=0,
            phase=TurnPhase.PREPARE,
            ends_at=0.0,
            round_cards=[],
        )

        room.status = RoomStatus.PLAYING
        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.game_started(room))
        return room


    async def _load_map_data(
        self, map_id: uuid.UUID
    ) -> tuple[MapInfo, dict[uuid.UUID, CardPackInfo], str]:
        map_obj: Map = await self.map_repo.get_map_with_relations(map_id)

        fields_dict: dict[int, MapField] = {}
        card_packs_info: dict[uuid.UUID, CardPackInfo] = {}

        for field in map_obj.fields:
            pack_id = cast(uuid.UUID, field.card_pack_id)

            fields_dict[field.position_index] = MapField(
                position_index=field.position_index,
                time_limit=field.time_limit,
                award=field.award,
                penalty=field.penalty,
                card_pack_id=pack_id,
            )

            if pack_id not in card_packs_info:
                cp = cast(CardPack, field.card_pack)
                card_packs_info[pack_id] = CardPackInfo(
                    card_pack_id=pack_id,
                    name=cp.name,
                    core_mechanic=cp.type.core_mechanic,
                    description=cp.description,
                )

        map_info = MapInfo(
            map_id=map_obj.id,
            name=map_obj.name,
            max_fields_count=map_obj.max_fields_count,
            fields=fields_dict,
        )

        return map_info, card_packs_info, map_obj.size

    async def _load_theme_info(
        self, theme_id: uuid.UUID, size: str
    ) -> ThemeInfo:
        theme: MapTheme | None = await self.map_repo.get_theme(theme_id)
        if theme is None:
            raise NotFoundError(ErrorMessage.MAP_THEME_NOT_FOUND)

        size_to_url = {
            "SMALL": theme.scene_url_small,
            "MEDIUM": theme.scene_url_medium,
            "LARGE": theme.scene_url_large,
        }

        scene_url = size_to_url.get(size)
        if not scene_url or not theme.piece_model_url or not theme.color_textures:
            raise BadRequestError(ErrorMessage.MAP_THEME_INCOMPLETE)

        return ThemeInfo(
            theme_id=theme.id,
            code=theme.code,
            name=theme.name,
            scene_url=scene_url,
            piece_model_url=theme.piece_model_url or "",
            color_textures=theme.color_textures or {},
        )

