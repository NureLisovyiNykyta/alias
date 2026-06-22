import info from '@/assets/info.svg';
import { useUI } from "@/contexts/UIContext.jsx";
import { useEffect, useState } from "react";

const PHASE_LABELS = {
  PREPARE: 'Preparing',
  GUESSING: 'Guessing',
  REVIEW: 'Reviewing results',
};

const PHASE_COLORS = {
  PREPARE: 'text-decorative-900',
  GUESSING: 'text-brand-700',
  REVIEW: 'text-team-green-dark',
};

export default function PhaseAndTimer({ phase, endsAt }) {
  const { isBoardOpen } = useUI();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endsAt || phase !== 'GUESSING') {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now() / 1000;
      const diff = Math.ceil(endsAt - now);
      setTimeLeft(Math.max(0, diff));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, phase]);

  const displayPhase = PHASE_LABELS[phase] || 'Waiting';

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={`fixed top-6 inset-x-0 flex justify-center pointer-events-none z-100 transition-all duration-300 ${
        isBoardOpen ? 'pr-[358px]' : 'pr-0'
      }`}
    >
      <div className='flex items-center gap-4 pointer-events-auto'>
        <div className='bg-white shadow-buttons flex items-center h-[50px] px-6 py-4 rounded-[12px] gap-3'>
          <p className='font-noto'>Phase</p>
          <span className={`text-btn font-noto ${PHASE_COLORS[phase]}`}>
            {displayPhase}
          </span>
          <img src={info} alt="Note"/>
        </div>

        {/* Показываем таймер только во время отгадывания, или всегда, но 0:00 в других фазах */}
        <div className='bg-white shadow-buttons flex items-center justify-center h-[50px] px-6 py-4 rounded-[12px]'>
          <h1 className='text-h1'>
            {displayTime}
          </h1>
        </div>
      </div>
    </div>
  );
}
