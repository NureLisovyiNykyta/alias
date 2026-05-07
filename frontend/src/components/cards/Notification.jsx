import cross from '@/assets/cross.svg';

const Notification = ({ isSuccess = true, title, message, onClose }) => {
  return (
    <div className='bg-white'>
      <div className={`w-[450px] rounded-[12px] py-2 px-[38px] gap-[38px] flex items-center shadow-buttons transition-colors
    ${isSuccess ? 'bg-decorative-500/22' : 'bg-white/90 border-2 border-text-warning'}`}>

        <div className='w-full flex flex-col justify-center gap-[10px]'>
          <h2 className='text-h2'>{title}</h2>
          <p className='font-noto text-p'>{message}</p>
        </div>

        <div className='py-[21px] flex shrink-0'>
          <button
            onClick={onClose}
            className='flex items-center justify-center p-2 hover:opacity-70 transition-opacity cursor-pointer'
          >
            <img src={cross} alt="Close Cross" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
