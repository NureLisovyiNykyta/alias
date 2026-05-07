import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException

from app.api.dependencies import get_connection_manager, get_game_repo
from app.core.messages import ErrorMessage
from app.repositories.game_repository import GameRepository
from app.ws.connection_manager import ConnectionManager
from app.ws.dependencies import _WS_FORBIDDEN, _WS_NOT_FOUND, get_ws_player_id
from app.ws.events import ClientEvent, ServerEvent

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/rooms/{room_code}")
async def room_websocket(
    ws: WebSocket,
    room_code: str,
    player_id: uuid.UUID = Depends(get_ws_player_id),
    game_repo: GameRepository = Depends(get_game_repo),
    conn_manager: ConnectionManager = Depends(get_connection_manager),
) -> None:
    room = await game_repo.get_room(room_code)
    if room is None:
        raise WebSocketException(code=_WS_NOT_FOUND)

    if player_id not in room.players:
        raise WebSocketException(code=_WS_FORBIDDEN)

    # --- Connect ---
    await conn_manager.connect(room_code, player_id, ws)

    room.players[player_id].is_online = True
    await game_repo.save_room(room)

    await conn_manager.send_personal(ws, ServerEvent.room_state(room))
    await conn_manager.broadcast_except(
        room_code, player_id, ServerEvent.player_connected(room.players[player_id])
    )

    # --- Listen loop ---
    try:
        while True:
            data = await ws.receive_text()
            try:
                ClientEvent.model_validate_json(data)
            except Exception:
                await conn_manager.send_personal(ws, ServerEvent.error(ErrorMessage.WS_INVALID_MESSAGE))

    except WebSocketDisconnect:
        pass

    finally:
        # --- Disconnect ---
        conn_manager.disconnect(room_code, player_id)

        room = await game_repo.get_room(room_code)
        if room is not None and player_id in room.players:
            room.players[player_id].is_online = False
            await game_repo.save_room(room)
            await conn_manager.broadcast(room_code, ServerEvent.player_disconnected(player_id))
