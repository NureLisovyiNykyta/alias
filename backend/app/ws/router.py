import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_connection_manager, get_db, get_game_repo
from app.core.messages import ErrorMessage
from app.repositories.chat_repository import ChatRepository
from app.repositories.game_repository import GameRepository
from app.services.chat import ChatService
from app.services.game import GameService
from app.ws.connection_manager import ConnectionManager
from app.ws.dependencies import _WS_FORBIDDEN, _WS_NOT_FOUND, get_ws_player_id
from app.ws.events import ClientEvent, ClientEventType, ServerEvent
from app.ws.events.client import AdjustScorePayload, CardSwipePayload, ChatMessagePayload, EditCardStatusPayload

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/rooms/{room_code}")
async def room_websocket(
    ws: WebSocket,
    room_code: str,
    player_id: uuid.UUID = Depends(get_ws_player_id),
    game_repo: GameRepository = Depends(get_game_repo),
    conn_manager: ConnectionManager = Depends(get_connection_manager),
    db: AsyncSession = Depends(get_db),
) -> None:
    room = await game_repo.get_room(room_code)
    if room is None:
        raise WebSocketException(code=_WS_NOT_FOUND)

    if player_id not in room.players:
        raise WebSocketException(code=_WS_FORBIDDEN)

    game_service = GameService(game_repo=game_repo, conn_manager=conn_manager, db=db)
    chat_repo = ChatRepository(game_repo.redis)
    chat_service = ChatService(chat_repo=chat_repo, game_repo=game_repo, conn_manager=conn_manager)

    # --- Connect ---
    await conn_manager.connect(room_code, player_id, ws)

    try:
        room.players[player_id].is_online = True
        await game_repo.save_room(room)

        await conn_manager.send_personal(ws, ServerEvent.room_state(room))
        await conn_manager.broadcast_except(
            room_code, player_id, ServerEvent.player_connected(room.players[player_id])
        )

        # Send chat history
        room_messages, team_messages = await chat_service.get_chat_history(room_code, player_id)
        await conn_manager.send_personal(ws, ServerEvent.chat_history(room_messages, team_messages))

        # If the game was paused (all offline), try to resume
        await game_service.handle_player_reconnect(room_code, player_id)

        # --- Listen loop ---
        while True:
            data = await ws.receive_text()
            try:
                event = ClientEvent.model_validate_json(data)
                await _dispatch_event(event, room_code, player_id, game_service, chat_service, conn_manager, ws)
            except Exception as exc:
                msg = str(exc) if str(exc) else ErrorMessage.WS_INVALID_MESSAGE
                await conn_manager.send_personal(ws, ServerEvent.error(msg))

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

            # If the disconnected player was the current explainer, handle it
            await game_service.handle_explainer_disconnect(room_code, player_id)


async def _dispatch_event(
    event: ClientEvent,
    room_code: str,
    player_id: uuid.UUID,
    game_service: GameService,
    chat_service: ChatService,
    conn_manager: ConnectionManager,
    ws: WebSocket,
) -> None:
    match event.type:
        case ClientEventType.PING:
            pass

        case ClientEventType.READY:
            await game_service.handle_ready(room_code, player_id)

        case ClientEventType.CARD_SWIPE:
            payload = _expect_payload(event, CardSwipePayload)
            await game_service.handle_card_swipe(room_code, player_id, payload.status)


        case ClientEventType.EDIT_CARD_STATUS:
            payload = _expect_payload(event, EditCardStatusPayload)
            await game_service.handle_edit_card_status(room_code, player_id, payload.card_id, payload.new_status)

        case ClientEventType.CONFIRM_RESULTS:
            await game_service.handle_confirm_results(room_code, player_id)

        case ClientEventType.ADJUST_SCORE:
            payload = _expect_payload(event, AdjustScorePayload)
            await game_service.handle_adjust_score(room_code, player_id, payload.team_id, payload.delta)

        case ClientEventType.RESTART_TURN:
            await game_service.handle_restart_turn(room_code, player_id)

        case ClientEventType.CHAT_MESSAGE:
            payload = _expect_payload(event, ChatMessagePayload)
            await chat_service.handle_chat_message(
                room_code=room_code,
                player_id=player_id,
                content=payload.content,
                target=payload.target,
                message_type=payload.message_type,
                media_url=payload.media_url,
            )


def _expect_payload[T](event: ClientEvent, cls: type[T]) -> T:
    if not isinstance(event.payload, cls):
        raise ValueError(ErrorMessage.WS_INVALID_MESSAGE)
    return event.payload
