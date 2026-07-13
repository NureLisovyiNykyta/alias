import info from '@/assets/info.svg';
import { useUI } from "@/contexts/UIContext.jsx";
import { useEffect, useState } from "react";
import Digit from "@/components/layouts/Digit.jsx";

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

export default function PhaseAndTimer({ phase, endsAt, timeLimit = 60 }) {
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

      if (diff > timeLimit) {
        setTimeLeft(timeLimit);
      } else if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, phase, timeLimit]);

  const displayPhase = PHASE_LABELS[phase] || 'Waiting';

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const timeArray = displayTime.split('');

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
          <img src={info} alt="Phase info" />
        </div>

        <div className='bg-white shadow-buttons flex items-center justify-center h-[50px] px-6 py-4 rounded-[12px] min-w-[100px]'>
          <div className={`text-h1 tabular-nums flex items-center ${timeLeft <= 10 && timeLeft > 0 && 'text-text-warning'}`}>
            {timeArray.map((char, index) => (
              char === ':' ?
                <span key={index} className="mx-[1px]">{char}</span> :
                <Digit key={index} value={char} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
