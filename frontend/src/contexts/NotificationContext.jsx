import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Notification from '@/components/cards/Notification.jsx';
import GameNotification from '@/components/cards/GameNotification.jsx';
import { useUI } from "@/contexts/UIContext.jsx";

const NotificationContext = createContext(null);

const NOTIFICATION_COMPONENTS = {
  default: Notification,
  game: GameNotification,
};

export const NotificationProvider = ({ children }) => {
  const { isBoardOpen } = useUI();

  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  const closeNotification = useCallback(() => {
    setNotification(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const showNotification = useCallback(({ title, message, isSuccess = true, type = 'default', autoClose = true }) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const id = Date.now() + Math.random().toString(36).substr(2, 9);

    setNotification({ id, title, message, isSuccess, type });

    if (autoClose) {
      timerRef.current = setTimeout(() => {
        closeNotification();
      }, 5000);
    }
  }, [closeNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}

      <AnimatePresence mode="popLayout">
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed z-[9999] transition-all duration-300 ${
              notification.type === 'game'
                ? isBoardOpen
                  ? 'bottom-6 right-[382px]'
                  : 'bottom-6 right-6'
                : 'top-[80px] right-[40px]'
            }`}
          >
            {(() => {
              const Component = NOTIFICATION_COMPONENTS[notification.type] || NOTIFICATION_COMPONENTS.default;
              return (
                <Component
                  title={notification.title}
                  message={notification.message}
                  isSuccess={notification.isSuccess}
                  onClose={closeNotification}
                />
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
