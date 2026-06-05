import { createContext, useContext, useState, useEffect } from 'react';
import { useGameSocket } from "@/sockets/useGameSockets.js";

const LobbyContext = createContext({});

export const LobbyProvider = ({ children }) => {
  const [activeRoom, setActiveRoom] = useState(() => localStorage.getItem('activeRoom') || null);

  const setRoom = (code) => {
    if (code) {
      console.log('code setup', code);
      localStorage.setItem('activeRoom', code);
      setActiveRoom(code);
    } else {
      console.log('code removal')
      localStorage.removeItem('activeRoom');
      setActiveRoom(null);
    }
  };

  const socket = useGameSocket(activeRoom);

  return (
    <LobbyContext.Provider value={{ activeRoom, setRoom, ...socket }}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
