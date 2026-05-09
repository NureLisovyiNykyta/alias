import star from '@/assets/star.svg';
import pokemonGo from '@/assets/pokemonGo.png';
import { formatPackDate } from "@/utils/parseTime.js";
import { Link } from "react-router-dom";
import React from "react";

const MapPreviewCard = ({ map }) => {
  return (
    <li className='flex items-center gap-5 py-6 rounded-[12px] w-full h-[320px]'>
      <img
        className='w-[420px] h-[270px] rounded-[12px] border border-text-label object-cover shrink-0'
        src={pokemonGo}
        alt='Map Image'
      />

      <div className='flex flex-col gap-4'>
        <h2 className='text-h1'>{map?.name}</h2>

        <div className='grid grid-cols-3 gap-y-8 gap-x-10 max-w-[700px]'>
          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Created</span>
            <p className='font-noto text-p'>{formatPackDate(map?.created_at)}</p>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Saved by</span>
            <p className='font-noto text-p'>{map?.saves_count} players</p>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Rating</span>
            <div className='flex items-center gap-2'>
              <img src={star} alt="Star rating"/>
              <p className='font-noto text-p'>{map?.rating_average}</p>
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Map template</span>
            <p className='font-noto text-p'>{map?.template?.name}</p>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Field Limit</span>
            <p className='font-noto text-p'>{map?.template?.max_fields_count}</p>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Author</span>
            <Link
              to={`/user/${map?.author?.username}`}
              className="flex items-center gap-2 hover:text-brand-500 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-brand-500 overflow-hidden flex items-center justify-center">
                {map?.author?.avatar_url ? (
                  <img src={map.author.avatar_url} alt="author" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-white font-bold">{map?.author?.nickname?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <p className='font-noto text-p'>{map?.author?.nickname || 'System'}</p>
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
};

export default MapPreviewCard;
