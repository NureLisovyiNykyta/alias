from uuid import UUID

from app.core.config import settings
from app.core.messages import ErrorMessage
from app.repositories.chat_repository import ChatRepository
from app.repositories.game_repository import GameRepository
from app.schemas.chat import ChatMessage, ChatTarget, MessageType
from app.schemas.game_room import RoomStateJSON, RoomStatus
from app.ws.connection_manager import ConnectionManager
from app.ws.events.server import ServerEvent


class ChatService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        game_repo: GameRepository,
        conn_manager: ConnectionManager,
    ) -> None:
        self.chat_repo = chat_repo
        self.game_repo = game_repo
        self.conn_manager = conn_manager

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    async def handle_chat_message(
        self,
        room_code: str,
        player_id: UUID,
        content: str,
        target: ChatTarget,
        message_type: MessageType = MessageType.TEXT,
        media_url: str | None = None,
    ) -> None:
        if message_type == MessageType.GIF:
            self._validate_gif(media_url)
        else:
            self._validate_content(content)

        room = await self.game_repo.get_room(room_code)
        if room is None:
            raise ValueError(ErrorMessage.ROOM_NOT_FOUND)

        player = room.players.get(player_id)
        if player is None:
            raise ValueError(ErrorMessage.ROOM_PLAYER_NOT_FOUND)

        message = ChatMessage(
            sender_id=player_id,
            sender_nickname=player.nickname,
            sender_avatar_url=player.avatar_url,
            target=target,
            team_id=player.team_id if target == ChatTarget.TEAM else None,
            content=content.strip(),
            message_type=message_type,
            media_url=media_url,
        )

        if target == ChatTarget.ROOM:
            await self._broadcast_room_message(room_code, message)
        elif target == ChatTarget.TEAM:
            if room.status != RoomStatus.PLAYING:
                raise ValueError(ErrorMessage.CHAT_TEAM_ONLY_IN_GAME)
            if player.team_id is None:
                raise ValueError(ErrorMessage.CHAT_NOT_IN_TEAM)
            await self._broadcast_team_message(room_code, room, player.team_id, message)

    async def get_chat_history(
        self, room_code: str, player_id: UUID
    ) -> tuple[list[ChatMessage], list[ChatMessage]]:
        room = await self.game_repo.get_room(room_code)
        if room is None:
            return [], []

        player = room.players.get(player_id)
        if player is None:
            return [], []

        room_messages = await self.chat_repo.get_room_messages(room_code)

        team_messages: list[ChatMessage] = []
        if player.team_id is not None and room.status == RoomStatus.PLAYING:
            team_messages = await self.chat_repo.get_team_messages(
                room_code, str(player.team_id)
            )

        return room_messages, team_messages

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    _ALLOWED_GIF_DOMAINS = ("media.giphy.com", "i.giphy.com", "media0.giphy.com",
                            "media1.giphy.com", "media2.giphy.com", "media3.giphy.com",
                            "media4.giphy.com")

    @staticmethod
    def _validate_content(content: str) -> None:
        if not content or not content.strip():
            raise ValueError(ErrorMessage.CHAT_MESSAGE_EMPTY)
        if len(content) > settings.CHAT_MAX_MESSAGE_LENGTH:
            raise ValueError(ErrorMessage.CHAT_MESSAGE_TOO_LONG.format(
                max_length=settings.CHAT_MAX_MESSAGE_LENGTH
            ))

    @classmethod
    def _validate_gif(cls, media_url: str | None) -> None:
        if not media_url:
            raise ValueError(ErrorMessage.CHAT_GIF_URL_REQUIRED)
        from urllib.parse import urlparse
        parsed = urlparse(media_url)
        if parsed.hostname not in cls._ALLOWED_GIF_DOMAINS:
            raise ValueError(ErrorMessage.CHAT_GIF_URL_INVALID)

    # ------------------------------------------------------------------
    # Broadcasting
    # ------------------------------------------------------------------

    async def _broadcast_room_message(
        self, room_code: str, message: ChatMessage
    ) -> None:
        await self.chat_repo.save_room_message(room_code, message)
        await self.conn_manager.broadcast(room_code, ServerEvent.chat_message(message))

    async def _broadcast_team_message(
        self, room_code: str, room: RoomStateJSON, team_id: UUID, message: ChatMessage
    ) -> None:
        await self.chat_repo.save_team_message(room_code, str(team_id), message)
        event = ServerEvent.chat_message(message)

        team = room.teams.get(team_id)
        if team is None:
            return

        for player_id in team.player_ids:
            await self.conn_manager.send_to_player(room_code, player_id, event)
