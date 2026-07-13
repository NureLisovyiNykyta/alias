import random
import uuid

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.core.security import generate_room_code
from app.models.user import User
from app.repositories.card_repository import CardRepository
from app.repositories.game_repository import GameRepository
from app.repositories.map_repository import MapRepository
from app.schemas.game_room import (
    CurrentTurn,
    Player,
    RoomStateJSON,
    RoomStatus,
    Settings,
    TurnPhase,
)
from app.schemas.room import CreateRoomRequest, JoinRoomRequest
from app.services.game import GameService
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
        map_info, card_packs_info, size = await self.map_repo.load_map_data(request.map_id)
        theme_info = await self.map_repo.load_theme_info(request.theme_id, size)

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
        self, room_code: str, user: User | None, guest_id: uuid.UUID | None,
        game_service: GameService | None = None,
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

        if room.status == RoomStatus.PLAYING and game_service is not None:
            await game_service.handle_leave_game(room_code, player_id)
            room = await self.game_repo.get_room(room_code)
            assert room is not None
            return room

        # LOBBY status
        player = room.players.get(player_id)
        if player is not None and player.team_id is not None and player.team_id in room.teams:
            team = room.teams[player.team_id]
            if player_id in team.player_ids:
                team.player_ids.remove(player_id)

        room.players.pop(player_id, None)

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
        if not first_team.player_ids:
            raise BadRequestError(
                ErrorMessage.ROOM_TEAM_INVALID_SIZE.format(name=first_team.name)
            )
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
