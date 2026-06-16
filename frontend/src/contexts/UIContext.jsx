import { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [isBoardOpen, setIsBoardOpen] = useState(() => {
    const saved = localStorage.getItem('isBoardOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('isBoardOpen', JSON.stringify(isBoardOpen));
  }, [isBoardOpen]);

  const toggleBoard = () => setIsBoardOpen((prev) => !prev);

  return (
    <UIContext.Provider value={{ isBoardOpen, toggleBoard }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};