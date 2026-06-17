import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/contexts/UIContext.jsx';

export default function ModalLayout({ isOpen, onClose, children }) {
  const { isBoardOpen } = useUI();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[7px] pointer-events-auto"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className={`relative z-40 w-full h-full flex items-center justify-center pointer-events-none transition-all duration-300 ${
              isBoardOpen ? 'pr-[358px]' : 'pr-0'
            }`}
          >
            <div className="pointer-events-auto cursor-default">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
