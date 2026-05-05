import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Notification from '@/components/Notification';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  const closeNotification = useCallback(() => {
    setNotification(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const showNotification = useCallback(({ title, message, isSuccess = true }) => {
    closeNotification();

    setNotification({ title, message, isSuccess });

    timerRef.current = setTimeout(() => {
      closeNotification();
    }, 10000);
  }, [closeNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-[80px] right-[40px] z-[9999]"
          >
            <Notification
              title={notification.title}
              message={notification.message}
              isSuccess={notification.isSuccess}
              onClose={closeNotification}
            />
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
