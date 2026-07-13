import star from '@/assets/star.svg';
import emptyStar from '@/assets/emptyStar.svg';
import plus from '@/assets/plus.svg';
import { Button } from "@/components/buttons/Button.jsx";
import { useRatePackMutation, useSavePackMutation } from "@/api/card-packs.js";
import Spinner from "@/components/layouts/Spinner.jsx";
import { Link } from 'react-router-dom'
import mapPreview from "@/assets/mapPreview.svg";
import done from '@/assets/doneMark.svg';
import { formatPackDate } from "@/utils/parseTime.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { parseErrors } from "@/utils/parseErrors.js";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useState } from "react";

const CardPack = ({ pack, type }) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  
  const { mutate: savePack, isPending } = useSavePackMutation();
  const { isAuthenticated } = useAuth();

  const { showNotification } = useNotification();

  const handleSave = () => {
    savePack(pack.id);
  };

  const { mutate: ratePack, isPending: isRating } = useRatePackMutation({
    onError: (error) => {
      showNotification({
        title: "Error occurred",
        message: `Failed to rate card pack. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  return (
    <li className='flex gap-8 p-6 rounded-[12px] w-full min-h-[250px] bg-surface'>
      {pack.image ? (<img
        className='w-[420px] h-[246px] rounded-[12px] border border-text-label object-cover shrink-0'
        src={pack.image}
        alt={pack.title}
      />) : (
        <div
          className='w-[420px] h-[246px] rounded-[12px] border border-text-label shrink-0 flex flex-col items-center justify-center gap-2'>
          <img src={mapPreview} alt="Map Template"/>
          <span className='text-label text-text-label'>No Image Selected</span>
        </div>
      )}


      <div className='flex flex-col justify-between w-full'>
        <div className='flex flex-col gap-4'>
          <h2 className='text-h1'>{pack.title}</h2>
          <p className='font-noto text-p'>{pack.description}</p>
        </div>

        <div className='flex flex-col gap-7 pt-4'>
          <ul className='flex items-center gap-8'>
            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Saved by</span>
              <p className='font-noto text-p'>{pack.savedBy} user{pack.savedBy === 1 ? '' : 's'}</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Created</span>
              <p className='font-noto text-p'>{formatPackDate(pack.created_at)}</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Rating</span>
              <div className='flex items-center gap-2'>
                <img src={star} alt="Star rating"/>
                <p className='font-noto text-p'>{pack.rating_average}</p>
              </div>
            </li>

            {isAuthenticated && type !== 'my_creations' &&
              <li className='flex flex-col gap-2'>
                <span className='text-label text-text-label font-noto'>Rate</span>
                <ul className='flex items-center gap-2' onMouseLeave={() => setHoveredRating(0)}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starValue = i + 1;

                    const isFilled = hoveredRating > 0
                      ? starValue <= hoveredRating
                      : starValue <= (pack.my_rating || 0);

                    return (
                      <li key={i}>
                        <button
                          className='w-full h-full flex items-center justify-center transition-opacity'
                          onMouseEnter={() => setHoveredRating(starValue)}
                          onClick={() => ratePack({ packId: pack.id, score: starValue })}
                          disabled={isRating || pack.my_rating === starValue}
                        >
                          <img
                            src={isFilled ? star : emptyStar}
                            alt={`${starValue} Star`}
                            className="transition-all duration-200 ease-in-out hover:scale-110"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            }
          </ul>

          <div className='flex items-center gap-7'>
            <Button variant='tertiary' as={Link} to={`/card-pack/${pack.id}`}>
              <span>Review {pack.title} pack</span>
            </Button>

            {type !== 'my_creations' && (
              <Button
                variant='secondary'
                onClick={handleSave}
                disabled={isPending || (type === 'community' && pack.is_saved)}
              >
                {isPending ? <Spinner size='sm'/> :
                  <div className='flex items-center justify-center gap-2'>
                    <img src={pack.is_saved ? done : plus} alt="Plus"/>
                    <span>{pack.is_saved ? type === 'saved' ? 'Remove from saved' : 'Saved to my packs' : 'Save to my packs'}</span>
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
