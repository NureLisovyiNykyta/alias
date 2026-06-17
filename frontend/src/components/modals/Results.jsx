import { useState } from "react";
import ModalLayout from "@/components/modals/ModalLayout.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import greenSuccess from '@/assets/greenSuccess.svg';
import neutralSuccess from '@/assets/neutralSuccess.svg';
import redFailure from '@/assets/redFailure.svg';
import neutralFailure from '@/assets/neutralFailure.svg';

export default function Results({ isOpen }) {
  const [results, setResults] = useState([
    { id: 1, word: 'Elephant', status: 'success' },
    { id: 2, word: 'Plant', status: 'failure' },
    { id: 3, word: 'Dog', status: 'success' },
    { id: 4, word: 'Car', status: 'failure' },
    { id: 5, word: 'Mountain', status: 'success' },
    { id: 6, word: 'Fairy', status: 'success' },
    { id: 7, word: 'Puppy', status: 'failure' },
    { id: 8, word: 'PC', status: 'success' },
    { id: 9, word: 'Wind', status: 'failure' },
    { id: 10, word: 'Bin', status: 'failure' },
  ]);

  const toggleStatus = (id, newStatus) => {
    setResults(prev => prev.map(item =>
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  const score = results.filter(r => r.status === 'success').length;

  return (
    <ModalLayout isOpen={isOpen}>
      <div className='bg-white rounded-[12px] w-[400px] max-h-[600px] flex items-center flex-col gap-6 px-12 py-6'>
        <h1 className='text-h1 text-center'>Results table</h1>

        <div className='w-full flex-1 overflow-y-auto pr-1'>
          <ul className='flex flex-col w-full'>
            {results.map((item) => (
              <li key={item.id} className='flex flex-col'>
                <div className='flex items-center justify-between py-1.5'>
                  <span className='font-noto text-btn text-text-primary'>{item.word}</span>

                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => toggleStatus(item.id, 'success')}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={item.status === 'success' ? greenSuccess : neutralSuccess}
                        alt="Success"
                      />
                    </button>

                    <button
                      onClick={() => toggleStatus(item.id, 'failure')}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={item.status === 'failure' ? redFailure : neutralFailure}
                        alt="Failure"
                        className="size-6"
                      />
                    </button>
                  </div>
                </div>

                <div className='w-full h-[0.5px] bg-surface-light shrink-0' />
              </li>
            ))}
          </ul>
        </div>

        <div className='w-full flex items-center justify-between font-noto text-btn text-text-primary pr-9.5'>
          <span>Score:</span>
          <span>{score}</span>
        </div>

        <Button className='shrink-0'>
          Confirm the results
        </Button>
      </div>
    </ModalLayout>
  );
}
