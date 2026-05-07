import star from '@/assets/star.svg';
import plus from '@/assets/plus.svg';
import { Button } from "@/components/buttons/Button.jsx";
import { useSavePackMutation } from "@/api/card-packs.js";
import Spinner from "@/components/layouts/Spinner.jsx";

const CardPack = ({ pack, type }) => {
  const { mutate: savePack, isPending } = useSavePackMutation();

  const handleSave = () => {
    savePack(pack.id);
  };

  return (
    <li className='flex gap-8 p-6 rounded-[12px] w-full min-h-[250px] bg-surface'>
      <img
        className='w-[420px] h-[246px] rounded-[12px] border border-text-label object-cover shrink-0'
        src={pack.image}
        alt={pack.title}
      />

      <div className='flex flex-col justify-between w-full'>
        <div className='flex flex-col gap-4'>
          <h2 className='text-h1'>{pack.title}</h2>
          <p className='font-noto text-p'>{pack.description}</p>
        </div>

        <div className='flex flex-col gap-7 pt-4'>
          <ul className='flex items-center gap-8'>
            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Saved by</span>
              <p className='font-noto text-p'>{pack.savedBy} users</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Pack contains</span>
              <p className='font-noto text-p'>{pack.positions} positions</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Rating</span>
              <div className='flex items-center gap-2'>
                <img src={star} alt="Star rating"/>
                <p className='font-noto text-p'>{pack.rating}</p>
              </div>
            </li>
          </ul>

          <div className='flex items-center gap-7'>
            <Button variant='tertiary'>
              <span>Review {pack.title} pack</span>
            </Button>

            {type === 'public' && (
              <Button
                variant='secondary'
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? <Spinner size='sm'/> :
                  <div className='flex items-center justify-center gap-2'>
                    <img src={plus} alt="Plus"/>
                    <span>Save to My packs</span>
                  </div>
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default CardPack;
