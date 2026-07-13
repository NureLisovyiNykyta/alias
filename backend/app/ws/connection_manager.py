from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket

from app.ws.events import ServerEvent


class ConnectionManager:
    def __init__(self) -> None:
        # room_code → {player_id: WebSocket}
        self._rooms: dict[str, dict[UUID, WebSocket]] = defaultdict(dict)


    async def connect(self, room_code: str, player_id: UUID, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms[room_code][player_id] = ws


    def disconnect(self, room_code: str, player_id: UUID) -> None:
        room_connections = self._rooms.get(room_code)
        if room_connections:
            room_connections.pop(player_id, None)
            if not room_connections:
                del self._rooms[room_code]


    async def broadcast(self, room_code: str, event: ServerEvent) -> None:
        data = event.model_dump_json()
        connections = list(self._rooms.get(room_code, {}).values())
        for ws in connections:
            await ws.send_text(data)


    async def broadcast_except(
        self, room_code: str, exclude_player_id: UUID, event: ServerEvent
    ) -> None:
        data = event.model_dump_json()
        for player_id, ws in list(self._rooms.get(room_code, {}).items()):
            if player_id != exclude_player_id:
                await ws.send_text(data)


    @staticmethod
    async def send_personal(ws: WebSocket, event: ServerEvent) -> None:
        await ws.send_text(event.model_dump_json())


    async def send_to_player(self, room_code: str, player_id: UUID, event: ServerEvent) -> None:
        ws = self._rooms.get(room_code, {}).get(player_id)
        if ws is not None:
            await ws.send_text(event.model_dump_json())


# Single application-wide instance
manager = ConnectionManager()
