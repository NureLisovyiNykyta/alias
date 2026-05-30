import { createContext, useContext, useState, useEffect } from 'react';
import { useGameSocket } from "@/sockets/useGameSockets.js";

const LobbyContext = createContext({});

export const LobbyProvider = ({ children }) => {
  const [activeRoom, setActiveRoom] = useState(() => localStorage.getItem('activeRoom') || null);

  const setRoom = (code) => {
    if (code) {
      localStorage.setItem('activeRoom', code);
      setActiveRoom(code);
    } else {
      localStorage.removeItem('activeRoom');
      setActiveRoom(null);
    }
  };

  const socket = useGameSocket(activeRoom);

  useEffect(() => {
    if (socket.isRoomClosed) {
      setRoom(null);
    }
  }, [socket.isRoomClosed]);

  return (
    <LobbyContext.Provider value={{ activeRoom, setRoom, ...socket }}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
