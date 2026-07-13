import { createContext, useContext, useState, useEffect } from 'react';
import { useGameSocket } from "@/sockets/useGameSockets.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useCheckLobbyQuery } from "@/api/lobby.js";

const LobbyContext = createContext({});

export const LobbyProvider = ({ children }) => {
  const { isLoading } = useAuth();

  const [activeRoom, setActiveRoom] = useState(() => {
    const saved = localStorage.getItem('activeRoomData');
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      return parsed.code || null;
    } catch (e) {
      return saved || null;
    }
  });

  const setRoom = (code) => {
    if (code) {
      console.log('code setup', code);
      localStorage.setItem('activeRoomData', JSON.stringify({ code }));
      setActiveRoom(code);
    } else {
      localStorage.removeItem('activeRoomData');
      setActiveRoom(null);
    }
  };

  const { mutate: checkLobbyStatus } = useCheckLobbyQuery({
    onSuccess: (data) => {
      if (!data?.exists || data?.status === 'CLOSED' || data?.status === 'FINISHED') {
        console.log('Room is closed, finished or does not exist. Clearing state.');
        setRoom(null);
      }
    },
    onError: (error) => {
      console.error('Failed to verify room status:', error);
      setRoom(null);
    }
  });

  useEffect(() => {
    if (activeRoom) {
      checkLobbyStatus(activeRoom);
    }
  }, []);

  const socket = useGameSocket(activeRoom, !isLoading);

  return (
    <LobbyContext.Provider value={{ activeRoom, setRoom, ...socket }}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
