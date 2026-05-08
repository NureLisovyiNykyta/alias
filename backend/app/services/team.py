import uuid

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.messages import ErrorMessage
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import RoomStateJSON, RoomStatus, Team, TeamColor
from app.ws.connection_manager import ConnectionManager
from app.ws.events import ServerEvent


class TeamService:
    def __init__(self, game_repo: GameRepository, conn_manager: ConnectionManager) -> None:
        self.game_repo = game_repo
        self.conn_manager = conn_manager


    async def create_team(
        self, room_code: str, name: str, color: TeamColor, host_id: uuid.UUID
    ) -> Team:
        room = await self._get_lobby_room(room_code)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        if any(t.color == color for t in room.teams.values()):
            raise BadRequestError(ErrorMessage.ROOM_TEAM_COLOR_TAKEN)

        team = Team(
            team_id=uuid.uuid4(),
            name=name,
            color=color,
            current_position=0,
            player_ids=[],
        )
        room.teams[team.team_id] = team
        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.team_created(team))
        return team


    async def update_team(
        self,
        room_code: str,
        team_id: uuid.UUID,
        name: str | None,
        color: TeamColor | None,
        host_id: uuid.UUID,
    ) -> Team:
        room = await self._get_lobby_room(room_code)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        team = room.teams.get(team_id)
        if team is None:
            raise NotFoundError(ErrorMessage.ROOM_TEAM_NOT_FOUND)

        if color is not None and color != team.color:
            if any(t.color == color for t in room.teams.values()):
                raise BadRequestError(ErrorMessage.ROOM_TEAM_COLOR_TAKEN)
            team.color = color

        if name is not None:
            team.name = name

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(room_code, ServerEvent.team_updated(team))
        return team


    async def delete_team(
        self, room_code: str, team_id: uuid.UUID, host_id: uuid.UUID
    ) -> None:
        room = await self._get_lobby_room(room_code)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        if team_id not in room.teams:
            raise NotFoundError(ErrorMessage.ROOM_TEAM_NOT_FOUND)

        kicked_ids: list[uuid.UUID] = []
        for player in room.players.values():
            if player.team_id == team_id:
                player.team_id = None
                kicked_ids.append(player.user_id)

        del room.teams[team_id]
        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code, ServerEvent.team_deleted(team_id, kicked_ids)
        )


    async def join_team(
        self,
        room_code: str,
        team_id: uuid.UUID,
        user: User | None,
        guest_id: uuid.UUID | None,
    ) -> None:
        room = await self._get_lobby_room(room_code)

        player_id = self._resolve_player_id(user, guest_id)

        if player_id not in room.players:
            raise NotFoundError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        team = room.teams.get(team_id)
        if team is None:
            raise NotFoundError(ErrorMessage.ROOM_TEAM_NOT_FOUND)

        if len(team.player_ids) >= room.settings.players_per_team_max:
            raise BadRequestError(ErrorMessage.ROOM_TEAM_FULL)

        player = room.players[player_id]
        old_team_id = player.team_id

        if old_team_id == team_id:
            return

        if old_team_id is not None and old_team_id in room.teams:
            old_team = room.teams[old_team_id]
            if player_id in old_team.player_ids:
                old_team.player_ids.remove(player_id)

        player.team_id = team_id
        team.player_ids.append(player_id)

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code, ServerEvent.player_team_changed(player_id, old_team_id, team_id)
        )


    async def leave_team(
        self,
        room_code: str,
        team_id: uuid.UUID,
        user: User | None,
        guest_id: uuid.UUID | None,
    ) -> None:
        room = await self._get_lobby_room(room_code)

        player_id = self._resolve_player_id(user, guest_id)

        if player_id not in room.players:
            raise NotFoundError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        player = room.players[player_id]
        if player.team_id != team_id:
            raise BadRequestError(ErrorMessage.ROOM_PLAYER_NOT_IN_TEAM)

        team = room.teams.get(team_id)
        if team is not None and player_id in team.player_ids:
            team.player_ids.remove(player_id)

        player.team_id = None

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code, ServerEvent.player_team_changed(player_id, team_id, None)
        )


    async def kick_from_team(
        self,
        room_code: str,
        team_id: uuid.UUID,
        player_id: uuid.UUID,
        host_id: uuid.UUID,
    ) -> None:
        room = await self._get_lobby_room(room_code)

        if room.host_id != host_id:
            raise ForbiddenError(ErrorMessage.ROOM_NOT_HOST)

        if team_id not in room.teams:
            raise NotFoundError(ErrorMessage.ROOM_TEAM_NOT_FOUND)

        if player_id not in room.players:
            raise NotFoundError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        player = room.players[player_id]
        if player.team_id != team_id:
            raise BadRequestError(ErrorMessage.ROOM_PLAYER_NOT_IN_TEAM)

        team = room.teams[team_id]
        if player_id in team.player_ids:
            team.player_ids.remove(player_id)

        player.team_id = None

        await self.game_repo.save_room(room)
        await self.conn_manager.broadcast(
            room_code, ServerEvent.player_team_changed(player_id, team_id, None)
        )


    # ---------------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------------


    async def _get_lobby_room(self, room_code: str) -> RoomStateJSON:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise NotFoundError(ErrorMessage.ROOM_NOT_FOUND)
        if room.status != RoomStatus.LOBBY:
            raise BadRequestError(ErrorMessage.ROOM_NOT_IN_LOBBY)
        return room


    @staticmethod
    def _resolve_player_id(user: User | None, guest_id: uuid.UUID | None) -> uuid.UUID:
        if user is not None:
            return user.id
        if guest_id is None:
            raise BadRequestError(ErrorMessage.ROOM_GUEST_ID_REQUIRED)
        return guest_id
