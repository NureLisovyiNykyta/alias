import uuid

import pytest
from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.map import Map, MapTheme
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import Player, RoomStateJSON, RoomStatus
from tests.game.conftest import ROOM_CODE, build_room


class TestCreateRoom:
    async def test_create_room_success(
        self,
        room_client: AsyncClient,
        game_repo: GameRepository,
        game_map: Map,
        game_theme: MapTheme,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/create",
            json={"room_name": "My Room", "map_id": str(game_map.id), "theme_id": str(game_theme.id)},
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "My Room"
        assert data["status"] == RoomStatus.LOBBY
        assert data["host_id"] == str(test_user.id)
        assert len(data["room_code"]) == 6

        stored = await game_repo.get_room(data["room_code"])
        assert stored is not None
        assert test_user.id in stored.players
        assert stored.players[test_user.id].nickname == test_user.nickname

    async def test_create_room_map_not_found(
        self,
        room_client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/create",
            json={"room_name": "My Room", "map_id": str(uuid.uuid4()), "theme_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert res.status_code == 404
        assert res.json()["detail"] == ErrorMessage.MAP_NOT_FOUND

    async def test_create_room_unauthenticated(
        self,
        room_client: AsyncClient,
        game_map: Map,
        game_theme: MapTheme,
    ) -> None:
        res = await room_client.post(
            "/api/rooms/create",
            json={"room_name": "My Room", "map_id": str(game_map.id), "theme_id": str(game_theme.id)},
        )
        assert res.status_code == 401


class TestJoinRoom:
    async def test_join_new_player(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/join",
            json={"room_code": ROOM_CODE},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert second_user.id in stored.players

    async def test_join_existing_player_updates_profile(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/join",
            json={"room_code": ROOM_CODE},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert second_user.id in stored.players

    async def test_join_room_not_found(
        self,
        room_client: AsyncClient,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/join",
            json={"room_code": "NOROOM"},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 404
        assert res.json()["detail"] == ErrorMessage.ROOM_NOT_FOUND

    async def test_join_room_not_in_lobby(
        self,
        room_client: AsyncClient,
        game_repo: GameRepository,
        room: RoomStateJSON,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        room.status = RoomStatus.PLAYING
        await game_repo.save_room(room)

        res = await room_client.post(
            "/api/rooms/join",
            json={"room_code": ROOM_CODE},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_NOT_IN_LOBBY

    async def test_join_as_guest(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
    ) -> None:
        guest_id = uuid.uuid4()
        res = await room_client.post(
            "/api/rooms/join",
            json={"room_code": ROOM_CODE, "guest_id": str(guest_id), "nickname": "Guest"},
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert guest_id in stored.players
        assert stored.players[guest_id].nickname == "Guest"


class TestLeaveRoom:
    async def test_leave_room_removes_player(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/leave",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert second_user.id not in stored.players

    async def test_leave_room_clears_team_membership(
        self,
        room_client: AsyncClient,
        game_repo: GameRepository,
        room_with_second_player: RoomStateJSON,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        team_id = uuid.uuid4()
        from app.schemas.game_room import Team, TeamColor
        r.teams[team_id] = Team(
            team_id=team_id, name="T", color=TeamColor.RED,
            current_position=0, player_ids=[second_user.id],
        )
        r.players[second_user.id].team_id = team_id
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/leave",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert second_user.id not in stored.players
        assert second_user.id not in stored.teams[team_id].player_ids

    async def test_host_cannot_leave(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/leave",
            json={},
            headers=auth_headers,
        )
        assert res.status_code == 403
        assert res.json()["detail"] == ErrorMessage.ROOM_HOST_CANNOT_LEAVE

    async def test_leave_player_not_in_room(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/leave",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 404
        assert res.json()["detail"] == ErrorMessage.ROOM_PLAYER_NOT_FOUND

    async def test_leave_as_guest(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
    ) -> None:
        guest_id = uuid.uuid4()
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[guest_id] = Player(user_id=guest_id, nickname="Guest", is_online=False)
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/leave",
            json={"guest_id": str(guest_id)},
        )
        assert res.status_code == 200
        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert guest_id not in stored.players


class TestCloseRoom:
    async def test_close_room_removes_from_redis(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/close",
            headers=auth_headers,
        )
        assert res.status_code == 204
        assert await game_repo.get_room(ROOM_CODE) is None

    async def test_close_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/close",
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403
        assert res.json()["detail"] == ErrorMessage.ROOM_NOT_HOST

    async def test_close_room_not_found(
        self,
        room_client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/NOROOM/close",
            headers=auth_headers,
        )
        assert res.status_code == 404


class TestStartGame:
    async def test_start_no_teams(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/start",
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert ErrorMessage.ROOM_NOT_ENOUGH_TEAMS.format(
            min=2, max=4
        ) in res.json()["detail"]

    async def test_start_team_too_small(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
        test_user: User,
    ) -> None:
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        from app.schemas.game_room import Team, TeamColor
        t1_id, t2_id = uuid.uuid4(), uuid.uuid4()
        r.teams[t1_id] = Team(
            team_id=t1_id, name="T1", color=TeamColor.GREEN,
            current_position=0, player_ids=[test_user.id],
        )
        r.teams[t2_id] = Team(
            team_id=t2_id, name="T2", color=TeamColor.BLUE,
            current_position=0, player_ids=[],
        )
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/start",
            headers=auth_headers,
        )
        assert res.status_code == 400

    async def test_start_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/start",
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403

    async def test_start_success(
        self,
        room_client: AsyncClient,
        ready_room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/start",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == RoomStatus.PLAYING
        assert data["current_turn"] is not None
        assert data["current_turn"]["phase"] == "PREPARE"

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.status == RoomStatus.PLAYING
        assert stored.current_turn is not None
