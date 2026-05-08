import uuid

import pytest
from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import RoomStateJSON, Team, TeamColor
from tests.game.conftest import ROOM_CODE


async def _add_team(
    game_repo: GameRepository,
    room_code: str,
    color: TeamColor = TeamColor.GREEN,
    name: str = "Team A",
) -> Team:
    r = await game_repo.get_room(room_code)
    assert r is not None
    team = Team(
        team_id=uuid.uuid4(), name=name, color=color, current_position=0, player_ids=[]
    )
    r.teams[team.team_id] = team
    await game_repo.save_room(r)
    return team


class TestCreateTeam:
    async def test_create_team_success(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams",
            json={"name": "Alpha", "color": "GREEN"},
            headers=auth_headers,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Alpha"
        assert data["color"] == "GREEN"

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        team_id = uuid.UUID(data["team_id"])
        assert team_id in stored.teams
        assert stored.teams[team_id].color == TeamColor.GREEN

    async def test_create_team_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams",
            json={"name": "Beta", "color": "BLUE"},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403
        assert res.json()["detail"] == ErrorMessage.ROOM_NOT_HOST

    async def test_create_team_color_taken(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams",
            json={"name": "Copy", "color": "GREEN"},
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_TEAM_COLOR_TAKEN

    async def test_create_team_room_not_found(
        self,
        room_client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.post(
            "/api/rooms/NOROOM/teams",
            json={"name": "X", "color": "RED"},
            headers=auth_headers,
        )
        assert res.status_code == 404


class TestUpdateTeam:
    async def test_update_team_name(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE, name="Old Name", color=TeamColor.GREEN)

        res = await room_client.patch(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            json={"name": "New Name"},
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["name"] == "New Name"

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.teams[team.team_id].name == "New Name"

    async def test_update_team_color(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN)

        res = await room_client.patch(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            json={"color": "BLUE"},
            headers=auth_headers,
        )
        assert res.status_code == 200

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.teams[team.team_id].color == TeamColor.BLUE

    async def test_update_team_color_taken(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN)
        team2 = await _add_team(game_repo, ROOM_CODE, color=TeamColor.BLUE, name="T2")

        res = await room_client.patch(
            f"/api/rooms/{ROOM_CODE}/teams/{team2.team_id}",
            json={"color": "GREEN"},
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_TEAM_COLOR_TAKEN

    async def test_update_team_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.patch(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            json={"name": "Hacked"},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403

    async def test_update_team_not_found(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        auth_headers: dict[str, str],
    ) -> None:
        res = await room_client.patch(
            f"/api/rooms/{ROOM_CODE}/teams/{uuid.uuid4()}",
            json={"name": "Ghost"},
            headers=auth_headers,
        )
        assert res.status_code == 404


class TestDeleteTeam:
    async def test_delete_team_success(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            headers=auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert team.team_id not in stored.teams

    async def test_delete_team_clears_player_team_ids(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        auth_headers: dict[str, str],
        second_user: User,
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            headers=auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[second_user.id].team_id is None

    async def test_delete_team_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403


class TestJoinTeam:
    async def test_join_team_success(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[second_user.id].team_id == team.team_id
        assert second_user.id in stored.teams[team.team_id].player_ids

    async def test_join_team_switches_from_old_team(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team_a = await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN, name="A")
        team_b = await _add_team(game_repo, ROOM_CODE, color=TeamColor.BLUE, name="B")

        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team_a.team_id
        r.teams[team_a.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team_b.team_id}/join",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[second_user.id].team_id == team_b.team_id
        assert second_user.id not in stored.teams[team_a.team_id].player_ids
        assert second_user.id in stored.teams[team_b.team_id].player_ids

    async def test_join_team_idempotent(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.teams[team.team_id].player_ids.count(second_user.id) == 1

    async def test_join_team_full(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.settings.players_per_team_max = 1
        fake_ids = [uuid.uuid4()]
        r.teams[team.team_id].player_ids = fake_ids
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_TEAM_FULL

    async def test_join_team_as_guest(
        self,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
    ) -> None:
        guest_id = uuid.uuid4()
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        from app.schemas.game_room import Player
        r.players[guest_id] = Player(user_id=guest_id, nickname="Guest", is_online=False)
        await game_repo.save_room(r)

        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
            json={"guest_id": str(guest_id)},
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[guest_id].team_id == team.team_id


class TestLeaveTeam:
    async def test_leave_team_success(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/leave",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[second_user.id].team_id is None
        assert second_user.id not in stored.teams[team.team_id].player_ids

    async def test_leave_wrong_team(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team_a = await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN, name="A")
        team_b = await _add_team(game_repo, ROOM_CODE, color=TeamColor.BLUE, name="B")
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team_a.team_id
        r.teams[team_a.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.post(
            f"/api/rooms/{ROOM_CODE}/teams/{team_b.team_id}/leave",
            json={},
            headers=second_user_auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_PLAYER_NOT_IN_TEAM


class TestKickFromTeam:
    async def test_kick_success(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/players/{second_user.id}",
            headers=auth_headers,
        )
        assert res.status_code == 204

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[second_user.id].team_id is None
        assert second_user.id not in stored.teams[team.team_id].player_ids

    async def test_kick_not_host(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/players/{test_user.id}",
            headers=second_user_auth_headers,
        )
        assert res.status_code == 403

    async def test_kick_player_not_in_team(
        self,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        res = await room_client.delete(
            f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/players/{second_user.id}",
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert res.json()["detail"] == ErrorMessage.ROOM_PLAYER_NOT_IN_TEAM
