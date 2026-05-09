import React from 'react';
import { Link } from 'react-router-dom';
import star from '@/assets/star.svg';
import plus from '@/assets/plus.svg';
import { Button } from "@/components/buttons/Button.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { useSaveMapMutation } from "@/api/maps.js";
import { formatPackDate } from "@/utils/parseTime.js";

const MapListCard = ({ map }) => {
  const { mutate: saveMap, isPending } = useSaveMapMutation();

  const handleSave = () => {
    if (map?.id) {
      saveMap(map.id);
    }
  };

  return (
    <li className='flex gap-8 p-6 rounded-[12px] w-full min-h-[250px] bg-surface'>
      <img
        className='w-[420px] h-[246px] rounded-[12px] border border-text-label object-cover shrink-0'
        src={map?.image_url || map?.cover_url || 'placeholder_image_path'}
        alt={map?.name || 'Map'}
      />

      <div className='flex flex-col justify-between w-full py-1'>
        <div className='flex flex-col gap-4'>
          <h2 className='text-h1'>{map?.name}</h2>
          <p className='font-noto text-p text-text leading-relaxed line-clamp-3'>
            {map?.description || 'No description provided.'}
          </p>
        </div>

        <div className='flex flex-col gap-6 pt-4'>
          <ul className='flex items-center gap-12'>
            <li className='flex flex-col gap-1'>
              <span className='text-label text-text-label font-noto'>Created</span>
              <p className='font-noto text-p'>{formatPackDate(map?.created_at)}</p>
            </li>

            <li className='flex flex-col gap-1'>
              <span className='text-label text-text-label font-noto'>Saved by</span>
              <p className='font-noto text-p'>{map?.saves_count || 0} players</p>
            </li>

            <li className='flex flex-col gap-1'>
              <span className='text-label text-text-label font-noto'>Rating</span>
              <div className='flex items-center gap-2'>
                <img src={star} alt="Star rating" className='w-5 h-5'/>
                <p className='font-noto text-p'>{map?.rating_average || '0.00'}</p>
              </div>
            </li>
          </ul>

          <div className='flex items-center gap-4'>
            <Button variant='tertiary' as={Link} to={`/map/${map?.id}`}>
              <span>Review {map?.name} map</span>
            </Button>

            {map?.is_public && (
              <Button
                variant='secondary'
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? (
                  <Spinner size='sm'/>
                ) : (
                  <div className='flex items-center justify-center gap-2'>
                    <img src={plus} alt="Plus"/>
                    <span>Save to My maps</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default MapListCard;
