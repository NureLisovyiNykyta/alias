import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/buttons/Button.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";

export default function ActiveLobbyWidget()  {
  const { activeRoom, roomData } = useLobby();
  const location = useLocation();

  const isHidden = !activeRoom || location.pathname.includes('/lobby');

  return (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-4 bg-brand-300 p-4 rounded-[16px] shadow-card-combined border border-text"
        >
          <div className="flex flex-col">
            <span className="text-label text-brand-900 font-bold uppercase">Active Game</span>
            <span className="text-h2 font-noto">Room <b>{activeRoom}</b></span>
          </div>

          <Button as={Link} to={`/lobby/${activeRoom}/${roomData?.status === 'PLAYING' ? 'game' : 'waiting'}`} variant="primary" className="h-[40px] px-6">
            Return
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
