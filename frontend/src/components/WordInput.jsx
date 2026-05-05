import plus from '@/assets/plus.svg';

const WordInput = () => {
  return (
    <div className='w-[417px] h-12 rounded-[8px] border border-text-label bg-white flex items-center py-[10px] px-4 justify-between'>
      <input
        placeholder='Add new word'
        type="text"
        className='font-noto text-label placeholder:text-text-label outline-none w-full'
      />
      <button
        className='h-6 w-6 flex items-center justify-center rounded-[8px] bg-brand-500 hover:bg-brand-700 transition-colors'
      >
        <img className='scale-70' src={plus} alt="Add Word"/>
      </button>
    </div>
  );
};

export default WordInput;
