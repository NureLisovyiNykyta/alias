import info from '@/assets/info.svg';

export default function PhaseAndTimer() {
  return (
    <div className='fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-4'>
      <div className='bg-white shadow-buttons flex items-center h-[50px] px-6 py-4 rounded-[12px] gap-3'>
        <p className='font-noto'>Phase</p>
        <span className='text-btn font-noto text-decorative-900'>Preparing</span>
        <img src={info} alt="Note"/>
      </div>

      <div className='bg-white shadow-buttons flex items-center justify-center h-[50px] px-6 py-4 rounded-[12px]'>
        <h1 className='text-h1'>0:60</h1>
      </div>
    </div>
  );
}