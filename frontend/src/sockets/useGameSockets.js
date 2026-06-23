import { useState, useEffect, useMemo } from "react";
import wsPackage, { ReadyState } from "react-use-websocket";
import Cookies from "js-cookie";

const useWebSocket = wsPackage.default || wsPackage;

export const useGameSocket = (roomCode) => {
  const [roomData, setRoomData] = useState(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);

  useEffect(() => {
    setIsRoomClosed(false);
    setRoomData(null);
  }, [roomCode]);

  // 1. Мемоизируем URL. Защищает от сбросов сокета при ререндерах компонентов.
  const socketUrl = useMemo(() => {
    if (!roomCode) return null;

    const token = Cookies.get("authToken");
    const guestId = localStorage.getItem("guest_id");
    const baseUrl = import.meta.env.VITE_WS_BASE_URL;

    if (token) return `${baseUrl}/ws/rooms/${roomCode}?token=${token}`;
    if (guestId) return `${baseUrl}/ws/rooms/${roomCode}?guest_id=${guestId}`;

    return null;
  }, [roomCode]);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    socketUrl,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 20,
      // 2. Делаем агрессивный реконнект каждую 1 секунду вместо долгой экспоненциальной паузы
      reconnectInterval: 1000,
      // Встроенный heartbeat убираем полностью!
      onOpen: () => console.log(`[WS] Connected to room: ${roomCode}`),
      onClose: () => console.log(`[WS] Disconnected from room: ${roomCode}`),
      onError: (event) => console.error("[WS] Error:", event),
    }
  );

  // 3. Ручной, железобетонный Ping каждые 10 секунд
  useEffect(() => {
    if (readyState !== ReadyState.OPEN) return;

    const interval = setInterval(() => {
      sendJsonMessage({ type: "ping" });
    }, 10000);

    return () => clearInterval(interval);
  }, [readyState, sendJsonMessage]);

  useEffect(() => {
    if (!lastJsonMessage) return;

    const { type, payload } = lastJsonMessage;
    console.log(`[WS] Event received: ${type}`, payload);

    setRoomData((prev) => {
      if (!prev && type !== "room_state") return prev;

      switch (type) {
        case "room_state":
        case "game_started":
          return payload.room;

        case "team_created":
        case "team_updated":
          return {
            ...prev,
            teams: {
              ...prev.teams,
              [payload.team.team_id]: payload.team,
            },
          };

        case "team_deleted": {
          const newTeams = { ...prev.teams };
          delete newTeams[payload.team_id];
          return { ...prev, teams: newTeams };
        }

        case "player_connected":
        case "player_joined":
          return {
            ...prev,
            players: {
              ...prev.players,
              [payload.player.user_id]: payload.player,
            },
          };

        case "player_disconnected":
          if (!prev.players[payload.player_id]) return prev;
          return {
            ...prev,
            players: {
              ...prev.players,
              [payload.player_id]: {
                ...prev.players[payload.player_id],
                is_online: false,
              },
            },
          };

        case "player_left": {
          const newPlayers = { ...prev.players };
          delete newPlayers[payload.player_id];
          return { ...prev, players: newPlayers };
        }

        case "player_team_changed": {
          const { player_id, old_team_id, new_team_id } = payload;
          const newTeams = { ...prev.teams };

          if (old_team_id && newTeams[old_team_id]) {
            newTeams[old_team_id] = {
              ...newTeams[old_team_id],
              player_ids: newTeams[old_team_id].player_ids?.filter(id => id !== player_id) || []
            };
          }

          if (new_team_id && newTeams[new_team_id]) {
            const currentPlayers = newTeams[new_team_id].player_ids || [];
            if (!currentPlayers.includes(player_id)) {
              newTeams[new_team_id] = {
                ...newTeams[new_team_id],
                player_ids: [...currentPlayers, player_id]
              };
            }
          }

          return {
            ...prev,
            teams: newTeams
          };
        }

        case "room_closed": {
          setIsRoomClosed(true);
          return prev;
        }

        case "turn_started":
        case "phase_changed": {
          return {
            ...prev,
            current_turn: payload.current_turn
          };
        }

        case "card_dealt": {
          if (!prev.current_turn) return prev;

          const cardExists = prev.current_turn.round_cards?.some(
            (c) => c.card_id === payload.card_id
          );

          if (cardExists) return prev;

          const newCard = {
            card_id: payload.card_id,
            content: payload.content,
            status: "UNPLAYED"
          };

          return {
            ...prev,
            current_turn: {
              ...prev.current_turn,
              round_cards: [...(prev.current_turn.round_cards || []), newCard]
            }
          };
        }

        case "error":
          console.error("Game error:", payload.message);
          return prev;

        default:
          return prev;
      }
    });
  }, [lastJsonMessage]);

  return {
    roomData,
    isConnected: readyState === ReadyState.OPEN,
    sendMessage: sendJsonMessage,
    isRoomClosed,
  };
};
