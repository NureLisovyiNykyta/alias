import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from "react-router-dom";
import book from '@/assets/book.png';
import maps from '@/assets/maps.png';
import CardPack from "@/components/cards/CardPack.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { getPublicPacks } from "@/api/card-packs";
import { getPublicMaps } from "@/api/maps.js";
import MapListCard from "@/components/cards/MapListCard.jsx";

const PACKS_LINK = '/gallery/packs';
const MAPS_LINK = '/gallery/maps';

export default function InfoCards() {
  const { data: packsData, isLoading: isPacksLoading } = useQuery({
    queryKey: ['publicPacksTop', { limit: 2 }],
    queryFn: () => getPublicPacks({ limit: 2, offset: 0 }),
  });

  const { data: mapsData, isLoading: isMapsLoading } = useQuery({
    queryKey: ['publicMapsTop', { limit: 2 }],
    queryFn: () => getPublicMaps({ limit: 2, offset: 0 }),
  });

  return (
    <div className='w-full flex flex-col gap-8'>
      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-4'>
          <img className='w-25 h-20 object-cover' src={book} alt="Book"/>
          <h1 className='text-h1'>Discover new community card packs</h1>
          <span className='text-label font-noto text-text-label'>updated weekly</span>
        </div>

        <Link
          to={PACKS_LINK}
          className='text-label font-noto text-brand-500 hover:text-brand-700'
        >
          Browse the gallery →
        </Link>
      </div>

      <ul className='flex flex-col gap-8 w-full justify-center relative'>
        {isPacksLoading ? (
          <div className='flex justify-center py-4'>
            <Spinner size='md'/>
          </div>
        ) : packsData?.items?.length > 0 ? (
          packsData.items.map((item) => {
            const mappedPack = {
              id: item.id,
              title: item.name,
              description: item.description,
              image: item.cover_url,
              savedBy: item.saves_count,
              positions: item.positions_count || 0,
              rating: item.rating_average,
              ...item,
            };

            return <CardPack key={item.id} pack={mappedPack} type="public" />;
          })
        ) : (
          <p className="font-noto text-p text-text-label text-center py-4">No community packs found.</p>
        )}
      </ul>

      <div className='flex items-center justify-between w-full mt-4'>
        <div className='flex items-center gap-4'>
          <img className='w-25 h-20 object-cover' src={maps} alt="Maps"/>
          <h1 className='text-h1'>Features public maps</h1>
          <span className='text-label font-noto text-text-label'>updated daily</span>
        </div>

        <Link
          to={MAPS_LINK}
          className='text-label font-noto text-brand-500 hover:text-brand-700'
        >
          Browse the gallery →
        </Link>
      </div>

      <ul className='flex flex-col gap-5 w-full min-h-[100px] justify-center relative'>
        {isMapsLoading ? (
          <div className='flex justify-center py-4'>
            <Spinner size='md'/>
          </div>
        ) : mapsData?.items?.length > 0 ? (
          mapsData.items.map((map) => (
            <MapListCard key={map.id} map={map} type='community' />
          ))
        ) : (
          <p className="font-noto text-p text-text-label text-center py-4">No public maps found.</p>
        )}
      </ul>

    </div>
  );
}
