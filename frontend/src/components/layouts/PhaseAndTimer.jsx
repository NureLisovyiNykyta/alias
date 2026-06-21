import info from '@/assets/info.svg';
import { useUI } from "@/contexts/UIContext.jsx";

export default function PhaseAndTimer() {
  const { isBoardOpen } = useUI();

  return (
    <div
      className={`fixed top-6 inset-x-0 flex justify-center pointer-events-none z-100 transition-all duration-300 ${
        isBoardOpen ? 'pr-[358px]' : 'pr-0'
      }`}
    >
      <div className='flex items-center gap-4 pointer-events-auto'>
        <div className='bg-white shadow-buttons flex items-center h-[50px] px-6 py-4 rounded-[12px] gap-3'>
          <p className='font-noto'>Phase</p>
          <span className='text-btn font-noto text-decorative-900'>Preparing</span>
          <img src={info} alt="Note"/>
        </div>

        <div className='bg-white shadow-buttons flex items-center justify-center h-[50px] px-6 py-4 rounded-[12px]'>
          <h1 className='text-h1'>0:60</h1>
        </div>
      </div>
    </div>
  );
}