import { motion } from 'framer-motion';

const Switch = ({
                  label,
                  helpText,
                  width = 'w-fit',
                  options = [
                    { label: 'Public', value: 'public' },
                    { label: 'Private', value: 'private' }
                  ],
                  value,
                  onChange
                }) => {
  return (
    <div className={`${width} flex flex-col gap-4`}>
      {label && (
        <span className="text-p font-noto">{label}</span>
      )}

      <div className="flex items-center w-fit py-2 px-4 bg-white border border-surface rounded-full shadow-buttons gap-4">
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              disabled={!onChange}
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`relative px-4 py-2 rounded-full font-noto text-btn transition-colors duration-300 z-10 ${
                isActive ? '' : 'bg-surface/50 hover:bg-surface'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-switch-pill"
                  className="absolute inset-0 bg-brand-500 rounded-full z-[-1]"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>

      {helpText && (
        <span className="text-label text-text-label font-noto">
          {helpText}
        </span>
      )}
    </div>
  );
};

export default Switch;
