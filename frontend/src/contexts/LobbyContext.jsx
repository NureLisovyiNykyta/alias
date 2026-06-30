import { createContext, useContext, useState, useEffect } from 'react';
import { useGameSocket } from "@/sockets/useGameSockets.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

const LobbyContext = createContext({});

const ROOM_MAX_TTL = (Number(import.meta.env.VITE_ROOM_TTL_PLAYING) || 14400) * 1000;

export const LobbyProvider = ({ children }) => {
  const { isLoading } = useAuth;

  const [activeRoom, setActiveRoom] = useState(() => {
    const saved = localStorage.getItem('activeRoomData');
    if (!saved) return null;

    try {
      const { code, createdAt } = JSON.parse(saved);
      if (Date.now() - createdAt > ROOM_MAX_TTL) {
        localStorage.removeItem('activeRoomData');
        return null;
      }
      return code;
    } catch (e) {
      localStorage.removeItem('activeRoomData');
      return null;
    }
  });

  const setRoom = (code) => {
    if (code) {
      console.log('code setup', code);
      const roomData = {
        code,
        createdAt: Date.now()
      };
      localStorage.setItem('activeRoomData', JSON.stringify(roomData));
      setActiveRoom(code);
    } else {
      localStorage.removeItem('activeRoomData');
      setActiveRoom(null);
    }
  };

  useEffect(() => {
    if (!activeRoom) return;

    const checkTokenExpiry = () => {
      const saved = localStorage.getItem('activeRoomData');
      if (!saved) return;

      try {
        const { createdAt } = JSON.parse(saved);
        if (Date.now() - createdAt > ROOM_MAX_TTL) {
          console.log('Active room TTL expired. Clearing state.');
          setRoom(null);
        }
      } catch (e) {
        setRoom(null);
      }
    };

    const interval = setInterval(checkTokenExpiry, 1000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  const socket = useGameSocket(activeRoom, !isLoading);

  return (
    <LobbyContext.Provider value={{ activeRoom, setRoom, ...socket }}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
