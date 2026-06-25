import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/buttons/Button.jsx";
import { useUI } from "@/contexts/UIContext.jsx";

export default function TurnAlert({ onStart }) {
  const { isBoardOpen } = useUI();

  return (
    <AnimatePresence>
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
            <h2 className='text-h2'>It's your turn!</h2>
            <p className='font-noto text-text-label'>Get ready to describe the words.</p>
          </div>

          <Button variant='primary' className='w-[200px]' onClick={onStart}>
            Ready to start
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
