import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/buttons/Button.jsx";
import { useUI } from "@/contexts/UIContext.jsx";

export default function TurnAlert() {
  const [isVisible, setIsVisible] = useState(true);
  const { isBoardOpen } = useUI();

  const handleStart = () => {
    setIsVisible(false);

    setTimeout(() => {
      setIsVisible(true);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={`fixed inset-0 z-50 pointer-events-none flex justify-center items-end pb-6 transition-all duration-300 ${
          isBoardOpen ? 'pr-[358px]' : 'pr-0'
        }`}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
            className='bg-white rounded-[12px] w-[417px] flex flex-col py-6 gap-3 justify-center items-center pointer-events-auto shadow-2xl'
          >
            <div className='flex flex-col text-center'>
              <h2 className='text-h2'>It's your turn to explain the words</h2>
              <p className='font-noto text-text-label'>Click when you're ready to start</p>
            </div>

            <Button onClick={handleStart}>
              Ready to start
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
