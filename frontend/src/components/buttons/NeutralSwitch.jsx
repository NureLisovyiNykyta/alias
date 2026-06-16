import { motion } from "framer-motion";

export default function NeutralSwitch({ options, activeId, onChange }) {
  return (
    <div className='-mx-4 border-b border-surface flex items-center px-4 gap-2'>
      {options.map(option => (
        <button
          key={option.id}
          type='button'
          onClick={() => onChange(option.id)}
          className={`relative w-1/2 flex justify-center py-4 text-label font-noto font-bold transition-colors
            ${activeId === option.id ? 'text-decorative-900' : 'text-text-label'}`}
        >
          <span className='relative px-1'>
            {option.label}

            {activeId === option.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -bottom-[17px] left-0 right-0 h-[3px] bg-decorative-900 rounded-t-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
