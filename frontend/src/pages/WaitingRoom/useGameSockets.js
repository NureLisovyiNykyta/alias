import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import wsPackage, { ReadyState } from "react-use-websocket";
import Cookies from "js-cookie";

const useWebSocket = wsPackage.default || wsPackage;

export const useGameSocket = (roomCode) => {
  const location = useLocation();
  const initialData = location.state?.initialRoomData || null;

  const [roomData, setRoomData] = useState(initialData);
  const [isRoomClosed, setIsRoomClosed] = useState(false);

  const getSocketUrl = () => {
    if (!roomCode) return null;

    const token = Cookies.get("authToken");
    const guestId = localStorage.getItem("guest_id");
    const baseUrl = import.meta.env.VITE_WS_BASE_URL;

    if (token) return `${baseUrl}/ws/rooms/${roomCode}?token=${token}`;
    if (guestId) return `${baseUrl}/ws/rooms/${roomCode}?guest_id=${guestId}`;

    return null;
  };

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    getSocketUrl(),
    {
      shouldReconnect: (closeEvent) => true,
      reconnectAttempts: 10,
      reconnectInterval: (attemptNumber) =>
        Math.min(Math.pow(2, attemptNumber) * 1000, 10000),

      heartbeat: {
        message: JSON.stringify({ type: "ping" }),
        returnMessage: "pong",
        timeout: 30000,
        interval: 25000,
      },

      onOpen: () => console.log(`[WS] Connected to room: ${roomCode}`),
      onClose: () => console.log(`[WS] Disconnected from room: ${roomCode}`),
      onError: (event) => console.error("[WS] Error:", event),
    }
  );

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
              [payload.player.id]: payload.player,
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
          return prev;
        }

        case "room_closed": {
          setIsRoomClosed(true);
          return prev;
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
