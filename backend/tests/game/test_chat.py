import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient
from httpx_ws import aconnect_ws

from app.models.user import User
from app.repositories.chat_repository import ChatRepository
from app.repositories.game_repository import GameRepository
from app.schemas.chat import ChatTarget
from app.schemas.game_room import (
    CurrentTurn,
    Player,
    RoomStateJSON,
    RoomStatus,
    Team,
    TeamColor,
    TurnPhase,
)
from app.services.chat import ChatService
from app.ws.connection_manager import ConnectionManager
from app.ws.events import ServerEventType
from tests.game.conftest import ROOM_CODE


def ws_url(room_code: str, player_id: uuid.UUID) -> str:
    return f"/ws/rooms/{room_code}?guest_id={player_id}"


def _send_chat(target: str = "room", content: str = "Hello!", message_type: str = "text", media_url: str | None = None) -> dict:
    payload: dict = {"target": target, "content": content, "message_type": message_type}
    if media_url:
        payload["media_url"] = media_url
    return {"type": "chat_message", "payload": payload}


class TestChatRoomBroadcast:
    """Test that room chat messages are broadcast to all players."""

    async def test_send_room_message(
        self,
        ws_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, second_user.id), ws_client) as ws2:
            await ws2.receive_json()  # room_state
            await ws2.receive_json()  # chat_history

            async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws1:
                await ws1.receive_json()  # room_state
                await ws1.receive_json()  # chat_history
                # consume player_connected that ws2 receives
                await ws2.receive_json()

                await ws1.send_json(_send_chat(content="Hey team!"))

                # Sender receives broadcast
                msg1 = await ws1.receive_json()
                assert msg1["type"] == ServerEventType.CHAT_MESSAGE
                assert msg1["payload"]["message"]["content"] == "Hey team!"
                assert msg1["payload"]["message"]["sender_nickname"] == "testuser"
                assert msg1["payload"]["message"]["target"] == "room"

                # Other player also receives
                msg2 = await ws2.receive_json()
                assert msg2["type"] == ServerEventType.CHAT_MESSAGE
                assert msg2["payload"]["message"]["content"] == "Hey team!"

    async def test_room_message_persisted_in_history(
        self,
        ws_client: AsyncClient,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> None:
        # First connection: send a message
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws1:
            await ws1.receive_json()  # room_state
            await ws1.receive_json()  # chat_history
            await ws1.send_json(_send_chat(content="Persisted msg"))
            await ws1.receive_json()  # chat_message broadcast

        # Second connection: check history
        async with aconnect_ws(ws_url(ROOM_CODE, second_user.id), ws_client) as ws2:
            await ws2.receive_json()  # room_state
            history = await ws2.receive_json()  # chat_history
            assert history["type"] == ServerEventType.CHAT_HISTORY
            assert len(history["payload"]["room_messages"]) >= 1
            assert history["payload"]["room_messages"][-1]["content"] == "Persisted msg"


class TestChatTeamMessages:
    """Test that team messages are only sent to team members."""

    @pytest.fixture
    async def room_with_teams(
        self,
        game_repo: GameRepository,
        room_with_second_player: RoomStateJSON,
        test_user: User,
        second_user: User,
    ) -> RoomStateJSON:
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None

        team1_id = uuid.uuid4()
        team2_id = uuid.uuid4()

        r.teams[team1_id] = Team(
            team_id=team1_id, name="Alpha", color=TeamColor.GREEN,
            current_position=0, player_ids=[test_user.id],
        )
        r.teams[team2_id] = Team(
            team_id=team2_id, name="Beta", color=TeamColor.BLUE,
            current_position=0, player_ids=[second_user.id],
        )
        r.players[test_user.id].team_id = team1_id
        r.players[second_user.id].team_id = team2_id
        r.status = RoomStatus.PLAYING
        r.current_turn = CurrentTurn(
            team_id=team1_id,
            explainer_id=test_user.id,
            explainer_index=0,
            phase=TurnPhase.PREPARE,
            ends_at=0.0,
            round_cards=[],
        )

        await game_repo.save_room(r)
        return r

    async def test_team_message_not_received_by_other_team(
        self,
        room_with_teams: RoomStateJSON,
        game_repo: GameRepository,
        redis_client,
        test_user: User,
        second_user: User,
    ) -> None:
        """Team message is saved only for the sender's team and
        delivered only to team members, not to the other team."""
        chat_repo = ChatRepository(redis_client)
        conn_manager = AsyncMock(spec=ConnectionManager)
        chat_service = ChatService(
            chat_repo=chat_repo, game_repo=game_repo, conn_manager=conn_manager,
        )

        # test_user sends a team message (team Alpha)
        await chat_service.handle_chat_message(
            room_code=ROOM_CODE,
            player_id=test_user.id,
            content="Secret plan",
            target=ChatTarget.TEAM,
        )

        # Message is stored in Alpha's team chat
        room = await game_repo.get_room(ROOM_CODE)
        assert room is not None
        team1_id = room.players[test_user.id].team_id
        team2_id = room.players[second_user.id].team_id
        assert team1_id is not None and team2_id is not None

        alpha_msgs = await chat_repo.get_team_messages(ROOM_CODE, str(team1_id))
        assert len(alpha_msgs) == 1
        assert alpha_msgs[0].content == "Secret plan"

        # Beta's team chat is empty
        beta_msgs = await chat_repo.get_team_messages(ROOM_CODE, str(team2_id))
        assert len(beta_msgs) == 0

        # send_to_player was called only for test_user (Alpha member)
        called_player_ids = [
            call.args[1] for call in conn_manager.send_to_player.call_args_list
        ]
        assert test_user.id in called_player_ids
        assert second_user.id not in called_player_ids

    async def test_team_message_requires_team_membership(
        self,
        room_with_teams: RoomStateJSON,
        game_repo: GameRepository,
        redis_client,
        test_user: User,
    ) -> None:
        """Player without a team gets an error sending team messages."""
        r = await game_repo.get_room(ROOM_CODE)
        assert r is not None
        r.players[test_user.id].team_id = None
        await game_repo.save_room(r)

        chat_repo = ChatRepository(redis_client)
        conn_manager = AsyncMock(spec=ConnectionManager)
        chat_service = ChatService(
            chat_repo=chat_repo, game_repo=game_repo, conn_manager=conn_manager,
        )

        with pytest.raises(ValueError):
            await chat_service.handle_chat_message(
                room_code=ROOM_CODE,
                player_id=test_user.id,
                content="No team",
                target=ChatTarget.TEAM,
            )

    async def test_team_chat_blocked_in_lobby(
        self,
        room_with_second_player: RoomStateJSON,
        game_repo: GameRepository,
        redis_client,
        test_user: User,
    ) -> None:
        """Team chat is not available in lobby."""
        chat_repo = ChatRepository(redis_client)
        conn_manager = AsyncMock(spec=ConnectionManager)
        chat_service = ChatService(
            chat_repo=chat_repo, game_repo=game_repo, conn_manager=conn_manager,
        )

        with pytest.raises(ValueError):
            await chat_service.handle_chat_message(
                room_code=ROOM_CODE,
                player_id=test_user.id,
                content="Too early",
                target=ChatTarget.TEAM,
            )


class TestChatValidation:
    """Test message validation rules."""

    async def test_empty_message_rejected(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_json(_send_chat(content="   "))
            error = await ws.receive_json()
            assert error["type"] == ServerEventType.ERROR

    async def test_too_long_message_rejected(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_json(_send_chat(content="x" * 501))
            error = await ws.receive_json()
            assert error["type"] == ServerEventType.ERROR

    async def test_gif_invalid_url_rejected(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_json(_send_chat(
                content="", message_type="gif", media_url="https://evil.com/hack.gif"
            ))
            error = await ws.receive_json()
            assert error["type"] == ServerEventType.ERROR

    async def test_gif_valid_url_accepted(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_json(_send_chat(
                content="", message_type="gif",
                media_url="https://media.giphy.com/media/abc123/giphy.gif"
            ))
            msg = await ws.receive_json()
            assert msg["type"] == ServerEventType.CHAT_MESSAGE
            assert msg["payload"]["message"]["message_type"] == "gif"
            assert "giphy.com" in msg["payload"]["message"]["media_url"]


class TestChatEmoji:
    """Test that emoji are supported in messages."""

    async def test_emoji_in_message(
        self,
        ws_client: AsyncClient,
        room: RoomStateJSON,
        test_user: User,
    ) -> None:
        async with aconnect_ws(ws_url(ROOM_CODE, test_user.id), ws_client) as ws:
            await ws.receive_json()  # room_state
            await ws.receive_json()  # chat_history

            await ws.send_json(_send_chat(content="🎉🔥👍 Привет!"))
            msg = await ws.receive_json()
            assert msg["type"] == ServerEventType.CHAT_MESSAGE
            assert msg["payload"]["message"]["content"] == "🎉🔥👍 Привет!"

