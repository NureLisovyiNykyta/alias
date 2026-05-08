import uuid

from httpx import AsyncClient
from httpx_ws import aconnect_ws

from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import Player, RoomStateJSON, Team, TeamColor
from app.ws.events import ServerEventType
from tests.game.conftest import ROOM_CODE
from tests.game.test_teams import _add_team


def ws_url(room_code: str, player_id: uuid.UUID) -> str:
    return f"/ws/rooms/{room_code}?guest_id={player_id}"


class TestWsTeamCreated:
    async def test_create_team_broadcasts_team_created(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/teams",
                json={"name": "Alpha", "color": "GREEN"},
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.TEAM_CREATED
            assert event["payload"]["team"]["name"] == "Alpha"
            assert event["payload"]["team"]["color"] == "GREEN"


class TestWsTeamUpdated:
    async def test_update_name_broadcasts_team_updated(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE, name="Old Name", color=TeamColor.GREEN)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.patch(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
                json={"name": "New Name"},
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.TEAM_UPDATED
            assert event["payload"]["team"]["team_id"] == str(team.team_id)
            assert event["payload"]["team"]["name"] == "New Name"

    async def test_update_color_broadcasts_team_updated(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE, color=TeamColor.GREEN)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.patch(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
                json={"color": "BLUE"},
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.TEAM_UPDATED
            assert event["payload"]["team"]["color"] == "BLUE"


class TestWsTeamDeleted:
    async def test_delete_empty_team_broadcasts_team_deleted(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.delete(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.TEAM_DELETED
            assert event["payload"]["team_id"] == str(team.team_id)
            assert event["payload"]["kicked_player_ids"] == []

    async def test_delete_team_with_players_broadcasts_kicked_ids(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.delete(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}",
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.TEAM_DELETED
            assert str(second_user.id) in event["payload"]["kicked_player_ids"]


class TestWsPlayerTeamChanged:
    async def test_join_team_broadcasts_player_team_changed(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
                json={},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_TEAM_CHANGED
            assert event["payload"]["player_id"] == str(second_user.id)
            assert event["payload"]["old_team_id"] is None
            assert event["payload"]["new_team_id"] == str(team.team_id)

    async def test_join_team_switch_broadcasts_old_and_new_team(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
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

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/teams/{team_b.team_id}/join",
                json={},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_TEAM_CHANGED
            assert event["payload"]["old_team_id"] == str(team_a.team_id)
            assert event["payload"]["new_team_id"] == str(team_b.team_id)

    async def test_leave_team_broadcasts_player_team_changed(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/leave",
                json={},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_TEAM_CHANGED
            assert event["payload"]["player_id"] == str(second_user.id)
            assert event["payload"]["old_team_id"] == str(team.team_id)
            assert event["payload"]["new_team_id"] is None

    async def test_kick_from_team_broadcasts_player_team_changed(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        team = await _add_team(game_repo, ROOM_CODE)
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[second_user.id].team_id = team.team_id
        r.teams[team.team_id].player_ids.append(second_user.id)
        await game_repo.save_room(r)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.delete(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/players/{second_user.id}",
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_TEAM_CHANGED
            assert event["payload"]["player_id"] == str(second_user.id)
            assert event["payload"]["old_team_id"] == str(team.team_id)
            assert event["payload"]["new_team_id"] is None

    async def test_guest_join_team_broadcasts_player_team_changed(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
    ) -> None:
        guest_id = uuid.uuid4()
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[guest_id] = Player(user_id=guest_id, nickname="Guest", is_online=False)
        await game_repo.save_room(r)

        team = await _add_team(game_repo, ROOM_CODE)

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/teams/{team.team_id}/join",
                json={"guest_id": str(guest_id)},
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_TEAM_CHANGED
            assert event["payload"]["player_id"] == str(guest_id)
            assert event["payload"]["new_team_id"] == str(team.team_id)
