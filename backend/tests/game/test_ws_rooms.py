import uuid

import pytest
from httpx import AsyncClient
from httpx_ws import WebSocketDisconnect, aconnect_ws

from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.schemas.game_room import RoomStateJSON, RoomStatus
from app.ws.dependencies import _WS_FORBIDDEN, _WS_NOT_FOUND
from app.ws.events import ServerEventType
from tests.game.conftest import ROOM_CODE


def ws_url(room_code: str, player_id: uuid.UUID) -> str:
    return f"/ws/rooms/{room_code}?guest_id={player_id}"


class TestWsConnect:
    async def test_connect_receives_room_state(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            msg = await ws.receive_json()

        assert msg["type"] == ServerEventType.ROOM_STATE
        assert msg["payload"]["room"]["room_code"] == ROOM_CODE

    async def test_connect_sets_player_online(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            stored = await game_repo.get_room(ROOM_CODE)
            assert stored is not None
            assert stored.players[test_user.id].is_online is True

    async def test_connect_broadcasts_player_connected_to_others(
        self,
        ws_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, second_user.id), ws_client) as ws_second:
            await ws_second.receive_json()  # room_state
            await ws_second.receive_json()  # chat_history

            async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws_host:
                await ws_host.receive_json()  # room_state
                await ws_host.receive_json()  # chat_history

                event = await ws_second.receive_json()
                assert event["type"] == ServerEventType.PLAYER_CONNECTED
                assert event["payload"]["player"]["user_id"] == str(test_user.id)


class TestWsDisconnect:
    async def test_disconnect_sets_player_offline(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

        stored = await game_repo.get_room(ROOM_CODE)
        assert stored is not None
        assert stored.players[test_user.id].is_online is False

    async def test_disconnect_broadcasts_player_disconnected(
        self,
        ws_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, second_user.id), ws_client) as ws_second:
            await ws_second.receive_json()  # room_state
            await ws_second.receive_json()  # chat_history

            async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws_host:
                await ws_host.receive_json()  # room_state
                await ws_host.receive_json()  # chat_history
                await ws_second.receive_json()  # player_connected for host
            # host disconnects here

            event = await ws_second.receive_json()
            assert event["type"] == ServerEventType.PLAYER_DISCONNECTED
            assert event["payload"]["player_id"] == str(test_user.id)


class TestWsMessages:
    async def test_invalid_json_returns_error(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_text("not-json-at-all")

            error = await ws.receive_json()
            assert error["type"] == ServerEventType.ERROR

    async def test_invalid_event_type_returns_error(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_text('{"type": "unknown_event"}')

            error = await ws.receive_json()
            assert error["type"] == ServerEventType.ERROR


class TestWsRejections:
    async def test_non_member_rejected(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
    ) -> None:
        stranger_id = uuid.uuid4()
        with pytest.raises(WebSocketDisconnect) as exc_info:
            async with aconnect_ws(ws_url(ROOM_CODE, stranger_id), ws_client):
                pass
        assert exc_info.value.code == _WS_FORBIDDEN

    async def test_room_not_found_rejected(
        self,
        ws_client: AsyncClient,
        test_user: User,
    ) -> None:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            async with aconnect_ws(ws_url("NOROOM", test_user.id), ws_client):
                pass
        assert exc_info.value.code == _WS_NOT_FOUND


class TestWsRoomBroadcasts:
    """HTTP actions that trigger WS broadcasts to connected players."""

    async def test_join_broadcasts_player_joined(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await room_client.post(
                "/api/rooms/join",
                json={"room_code": ROOM_CODE},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_JOINED
            assert event["payload"]["player"]["user_id"] == str(second_user.id)

    async def test_leave_broadcasts_player_left(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/leave",
                json={},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.PLAYER_LEFT
            assert event["payload"]["player_id"] == str(second_user.id)

    async def test_close_broadcasts_room_closed(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/close",
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.ROOM_CLOSED
            assert event["payload"]["room_code"] == ROOM_CODE

    async def test_start_game_broadcasts_game_started(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        ready_room: RoomStateJSON,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await room_client.post(
                f"/api/rooms/{ROOM_CODE}/start",
                headers=auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.GAME_STARTED
            assert event["payload"]["room"]["status"] == RoomStatus.PLAYING

    async def test_rejoin_existing_player_broadcasts_room_state(
        self,
        ws_client: AsyncClient,
        room_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Re-joining an already present player updates their profile
        and broadcasts ROOM_STATE (not PLAYER_JOINED) to all."""
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await room_client.post(
                "/api/rooms/join",
                json={"room_code": ROOM_CODE},
                headers=second_user_auth_headers,
            )

            event = await ws.receive_json()
            assert event["type"] == ServerEventType.ROOM_STATE
            assert str(second_user.id) in event["payload"]["room"]["players"]


class TestWsReconnect:
    """Player disconnects and reconnects via WebSocket."""

    async def test_reconnect_sets_player_online(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        game_repo: GameRepository,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history
        # disconnected → is_online=False

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            stored = await game_repo.get_room(ROOM_CODE)
            assert stored is not None
            assert stored.players[test_user.id].is_online is True

    async def test_reconnect_receives_fresh_room_state(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()
            await ws.receive_json()  # chat_history

        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            msg = await ws.receive_json()
            assert msg["type"] == ServerEventType.ROOM_STATE
            assert msg["payload"]["room"]["room_code"] == ROOM_CODE

    async def test_reconnect_broadcasts_player_connected_to_others(
        self,
        ws_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> None:
        # first connect + disconnect host
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()
            await ws.receive_json()  # chat_history

        # second_user connects and listens
        async with aconnect_ws(ws_url(ROOM_CODE, second_user.id), ws_client) as ws_second:
            await ws_second.receive_json()  # room_state
            await ws_second.receive_json()  # chat_history

            # host reconnects
            async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws_host:
                await ws_host.receive_json()  # room_state
                await ws_host.receive_json()  # chat_history

                event = await ws_second.receive_json()
                assert event["type"] == ServerEventType.PLAYER_CONNECTED
                assert event["payload"]["player"]["user_id"] == str(test_user.id)
