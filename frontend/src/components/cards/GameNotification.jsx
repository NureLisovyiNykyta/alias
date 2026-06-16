import cross from '@/assets/neutralCross.svg';

export default function GameNotification({ title, message, isSuccess, onClose }) {
  return (
    <div className='bg-white rounded-[12px] p-4 shadow-buttons w-[375px] flex items-start justify-between'>
      <div className='flex flex-col'>
        <h2 className={`text-h2 ${isSuccess !== null ? isSuccess ? 'text-decorative-900' : 'text-text-warning' : ''}`}>{title}</h2>

        {message && (
          <p className='font-noto text-text-label'>
            {message}
          </p>
        )}
      </div>

      <button
        onClick={onClose}
        className='p-1 hover:bg-surface rounded-full transition-colors cursor-pointer shrink-0'
      >
        <img src={cross} alt="Close"/>
      </button>
    </div>
  );
}
