import { motion, AnimatePresence } from "framer-motion";

export default function Digit({ value }) {
  return (
    <div className="relative overflow-hidden inline-block w-[0.6em] h-[1.2em]">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}