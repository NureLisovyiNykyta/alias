import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/buttons/Button.jsx";

export default function TurnAlert() {
  const [isVisible, setIsVisible] = useState(true);

  const handleStart = () => {
    setIsVisible(false);

    setTimeout(() => {
      setIsVisible(true);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 50, x: "-50%" }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20
          }}
          className='fixed bottom-6 left-1/2 bg-white rounded-[12px] w-[417px] flex flex-col py-6 gap-3 justify-center items-center'
        >
          <div className='flex flex-col text-center'>
            <h2 className='text-h2'>It's your turn to explain the words</h2>
            <p className='font-noto text-text-label'>Click when you're ready to start</p>
          </div>

          <Button onClick={handleStart}>
            Ready to start
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
