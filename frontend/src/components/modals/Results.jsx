import ModalLayout from "@/components/modals/ModalLayout.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import greenSuccess from '@/assets/greenSuccess.svg';
import neutralSuccess from '@/assets/neutralSuccess.svg';
import redFailure from '@/assets/redFailure.svg';
import neutralFailure from '@/assets/neutralFailure.svg';

export default function Results({
                                  isOpen,
                                  isEditable,
                                  roundCards = [],
                                  award = 1,
                                  penalty = 1,
                                  onEditCardStatus,
                                  onConfirm,
                                  onOkay
                                }) {
  const score = roundCards.reduce((acc, card) => {
    if (card.status === 'GUESSED') return acc + award;
    if (card.status === 'FAILED') return acc - penalty;
    return acc;
  }, 0);

  return (
    <ModalLayout isOpen={isOpen}>
      <div className='bg-white w-[542px] rounded-[12px] p-6 flex flex-col items-center gap-6'>
        <h2 className='text-h2 text-text-primary'>Results</h2>

        <div className='w-full flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2'>
          <ul className='flex flex-col w-full'>
            {roundCards.map(card => (
              <li key={card.card_id} className='flex flex-col w-full'>
                <div className='w-full flex items-center justify-between py-3.5 pr-2.5'>
                  <span className='font-noto text-btn text-text-primary'>
                    {card.content?.text}
                  </span>

                  <div className='flex items-center gap-2'>
                    {isEditable ? (
                      <>
                        {/* Кнопка "Угадано" */}
                        <button
                          onClick={() => onEditCardStatus(card.card_id, 'GUESSED')}
                          className="cursor-pointer hover:opacity-80 transition-opacity outline-none"
                        >
                          <img
                            src={card.status === 'GUESSED' ? greenSuccess : neutralSuccess}
                            alt="Guessed"
                          />
                        </button>

                        <button
                          onClick={() => onEditCardStatus(card.card_id, 'FAILED')}
                          className="cursor-pointer hover:opacity-80 transition-opacity outline-none"
                        >
                          <img
                            src={card.status === 'FAILED' ? redFailure : neutralFailure}
                            alt="Failed"
                            className="size-6"
                          />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 pr-2">
                        {card.status === 'GUESSED' && <img src={greenSuccess} alt="Guessed" />}
                        {card.status === 'FAILED' && <img src={redFailure} alt="Failed" className="size-6" />}
                        {card.status === 'UNPLAYED' && <span className="font-noto text-label text-text-secondary">Unplayed</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className='w-full h-[0.5px] bg-surface-light shrink-0' />
              </li>
            ))}
          </ul>
        </div>

        <div className='w-full flex items-center justify-between font-noto text-btn text-text-primary pr-9.5'>
          <span>Score:</span>
          <span>{score > 0 ? `+${score}` : score}</span>
        </div>

        {isEditable && (
          <Button
            className='shrink-0 min-w-[70px]'
            onClick={isEditable ? onConfirm : onOkay}
          >
            {isEditable ? 'Confirm the results' : 'Okay'}
          </Button>
        )}
      </div>
    </ModalLayout>
  );
}
