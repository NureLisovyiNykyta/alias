import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Cookies from "js-cookie";

export const useGameSocket = (roomCode) => {
  const location = useLocation();
  const initialData = location.state?.initialRoomData || null;

  const [roomData, setRoomData] = useState(initialData);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!roomCode) {
      console.log("WebSocket connection aborted: No roomCode provided");
      return;
    }

    const token = Cookies.get('authToken');
    const guestId = localStorage.getItem('guest_id');
    const baseUrl = import.meta.env.VITE_WS_BASE_URL;

    let wsUrl = `${baseUrl}/ws/rooms/${roomCode}`;

    if (token) {
      wsUrl += `?token=${token}`;
    } else if (guestId) {
      wsUrl += `?guest_id=${guestId}`;
    } else {
      console.log("WebSocket connection aborted: Missing auth token or guest ID");
      return;
    }

    console.log(`Attempting WebSocket connection to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let pingInterval;

    ws.onopen = () => {
      console.log(`WebSocket successfully connected to room: ${roomCode}`);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`WebSocket message received, type: ${data.type}`, data);

        switch (data.type) {
          case 'room_state':
            setRoomData(data.payload.room);
            break;

          case 'team_created':
          case 'team_updated':
            setRoomData(prev => prev ? {
              ...prev,
              teams: {
                ...prev.teams,
                [data.payload.team.team_id]: data.payload.team
              }
            } : prev);
            break;

          case 'team_deleted':
            setRoomData(prev => {
              if (!prev) return prev;
              const newTeams = { ...prev.teams };
              delete newTeams[data.payload.team_id];
              return { ...prev, teams: newTeams };
            });
            break;

          default:
            break;
        }
      } catch (error) {
        console.error("WebSocket message parsing error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket encountered an error:", error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      clearInterval(pingInterval);
    };

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        console.log("Cleaning up WebSocket connection on component unmount");
        ws.close();
      }
    };
  }, [roomCode]);

  return { roomData, ws: wsRef.current };
};
