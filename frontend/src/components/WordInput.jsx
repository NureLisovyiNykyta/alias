import React, { useState } from 'react';
import plus from '@/assets/plus.svg';

const WordInput = ({ onAdd }) => {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className='w-[417px] h-12 rounded-[8px] border border-text-label bg-white flex items-center py-[10px] px-4 justify-between'>
      <input
        placeholder='Add new word'
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className='font-noto text-label placeholder:text-text-label outline-none w-full'
      />
      <button
        onClick={handleAdd}
        className='h-6 w-6 flex items-center justify-center rounded-[8px] bg-brand-500 hover:bg-brand-700 transition-colors shrink-0'
      >
        <img className='scale-70' src={plus} alt="Add Word"/>
      </button>
    </div>
  );
};

export default WordInput;
