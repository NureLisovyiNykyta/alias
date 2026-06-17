import ModalLayout from "@/components/modals/ModalLayout.jsx";
import guess from "@/assets/guess.svg";
import leftArrow from '@/assets/wordArrowLeft.svg';
import rightArrow from '@/assets/wordArrowRight.svg';

export default function GuessModal({ isOpen }) {
  const actionButtons = [
    { id: 1, bg: 'bg-team-brown-dark', title: 'Skip', label: '(Failed)', arrow: leftArrow },
    { id: 2, bg: 'bg-team-green-dark', title: 'Got it!', label: '(Guessed)', arrow: rightArrow },
  ];

  return (
    <ModalLayout isOpen={isOpen}>
      <div className='bg-white w-[542px] rounded-[12px] relative flex flex-col p-6 gap-[35px]'>
        <img src={guess} alt="Guess" className="absolute right-6 top-6"/>

        <div className='flex flex-col gap-3.5 items-center'>
          <p className='font-noto'>Card 4 of 7</p>
          <ul className='flex items-center gap-1'>
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i} className={`w-7 h-1.5 rounded-full ${i > 3 ? 'bg-surface-light' : 'bg-brand-500'}`}/>
            ))}
          </ul>
        </div>

        <div className='flex flex-col w-full gap-[26px]'>
          <div className='w-full h-[180px] rounded-[12px] p-5 flex flex-col items-center justify-center gap-2.5 bg-surface-light'>
            <p className='font-noto'>Word</p>
            <h2 className="font-bold text-[40px] leading-[100%] tracking-normal">Elephant</h2>
          </div>

          <ul className='flex items-center justify-between w-[185px] self-center'>
            {actionButtons.map(button => (
              <li key={button.id} className='flex flex-col gap-4 items-center'>
                <button type='button' className={`size-[46px] rounded-full flex items-center justify-center ${button.bg} hover:bg-black/30 active:bg-black/70 transition-colors`}>
                  <img src={button.arrow} alt='Skip Word'/>
                </button>

                <div className='flex flex-col gap-3 text-center font-noto'>
                  <span className='text-btn'>{button.title}</span>
                  <span className='text-label'>{button.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalLayout>
  );
}
