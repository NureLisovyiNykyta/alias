import { useState, useEffect, useMemo } from "react";
import wsPackage, { ReadyState } from "react-use-websocket";
import Cookies from "js-cookie";
import { roomDataReducer } from "./roomDataReducer";

const useWebSocket = wsPackage.default || wsPackage;

export const useGameSocket = (roomCode, isAllowedToConnect = false) => {
  const [roomData, setRoomData] = useState(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [chatMessages, setChatMessages] = useState({ room: [], team: [] });

  useEffect(() => {
    setIsRoomClosed(false);
    setRoomData(null);
    setChatMessages({ room: [], team: [] });
  }, [roomCode]);

  const socketUrl = useMemo(() => {
    if (!roomCode || !isAllowedToConnect) return null;

    const token = Cookies.get("authToken");
    const guestId = localStorage.getItem("guest_id");
    const baseUrl = import.meta.env.VITE_WS_BASE_URL;

    if (token) return `${baseUrl}/ws/rooms/${roomCode}?token=${token}`;
    if (guestId) return `${baseUrl}/ws/rooms/${roomCode}?guest_id=${guestId}`;

    return null;
  }, [roomCode, isAllowedToConnect]);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    socketUrl,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 20,
      reconnectInterval: 1000,
      onOpen: () => console.log(`[WS] Connected to room: ${roomCode}`),
      onClose: () => console.log(`[WS] Disconnected from room: ${roomCode}`),
      onError: (event) => console.error("[WS] Error:", event),
    }
  );

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

    if (type === "chat_history") {
      setChatMessages({
        room: payload.room_messages || [],
        team: payload.team_messages || []
      });
      return;
    }

    if (type === "chat_message") {
      setChatMessages((prev) => {
        const target = payload.message.target;
        return {
          ...prev,
          [target]: [...prev[target], payload.message]
        };
      });
      return;
    }

    if (type === "room_closed") {
      setIsRoomClosed(true);
      return;
    }

    if (type === "error") {
      console.error("Game error:", payload.message);
      return;
    }

    setRoomData((prev) => roomDataReducer(prev, lastJsonMessage));

  }, [lastJsonMessage]);

  return {
    roomData,
    chatMessages,
    isConnected: readyState === ReadyState.OPEN,
    sendMessage: sendJsonMessage,
    isRoomClosed,
    lastJsonMessage,
  };
};
