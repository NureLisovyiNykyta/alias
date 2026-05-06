import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from "@/components/Button.jsx";

const WordImportForm = ({ isOpen, onClose, initialWords = [], onApply }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialWords.join(', '));
    }
  }, [isOpen, initialWords]);

  const handleApply = () => {
    const newWords = text
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    const uniqueWords = [...new Set(newWords)];
    onApply(uniqueWords);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className='w-[804px] h-[429px] rounded-[12px] border border-text-label bg-surface-light gap-8 p-4 flex flex-col'>
          <div className='w-full flex flex-col gap-2'>
            <Dialog.Title as="h2" className='text-h2'>Import</Dialog.Title>
            <span className='text-label text-text-label font-noto'>Enter keywords separated by commas, and they will automatically appear in your list.</span>
          </div>

          <textarea
            placeholder='Add the words'
            value={text}
            onChange={(e) => setText(e.target.value)}
            className='w-full bg-white rounded-[8px] h-full border border-text-label p-4 text-label font-noto outline-none placeholder:text-text-label resize-none'
          />

          <div className='flex w-full items-center justify-between'>
            <Button variant='tertiary' onClick={onClose}>
              Cancel
            </Button>

            <Button
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default WordImportForm;
