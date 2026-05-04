import React, { useState, useEffect } from 'react';
import RowNavigation from "@/components/RowNavigation.jsx";
import CardPack from "@/components/CardPack.jsx";
import { Button } from "@/components/Button.jsx";
import DropDown from "@/components/DropDown.jsx";
import {
  usePublicPacksQuery,
  useSavedPacksQuery,
  useMyPacksQuery
} from "@/api/card-packs";
import Spinner from "@/components/Spinner.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Packs Gallery", id: 2 },
];

const TABS = {
  COMMUNITY: 'community',
  SAVED: 'saved',
  MY_CREATIONS: 'my_creations',
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'most_saved', label: 'Most Saved' },
];

const ITEMS_PER_PAGE = 20;

const PacksGallery = () => {
  const [activeTab, setActiveTab] = useState(TABS.COMMUNITY);
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortOption]);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const queryParams = {
    limit: ITEMS_PER_PAGE,
    offset,
    ...(activeTab === TABS.COMMUNITY && { sort_by: sortOption.id })
  };

  const { data: publicData, isLoading: isPublicLoading } = usePublicPacksQuery(queryParams, {
    enabled: activeTab === TABS.COMMUNITY
  });

  const { data: savedData, isLoading: isSavedLoading } = useSavedPacksQuery(queryParams, {
    enabled: activeTab === TABS.SAVED
  });

  const { data: myData, isLoading: isMyLoading } = useMyPacksQuery(queryParams, {
    enabled: activeTab === TABS.MY_CREATIONS
  });

  const isLoading = isPublicLoading || isSavedLoading || isMyLoading;

  let currentData = { items: [], total: 0 };
  if (activeTab === TABS.COMMUNITY && publicData) currentData = publicData;
  if (activeTab === TABS.SAVED && savedData) currentData = savedData;
  if (activeTab === TABS.MY_CREATIONS && myData) currentData = myData;

  const totalPages = Math.ceil(currentData.total / ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <main className="flex flex-col w-full gap-5 h-full">
      <RowNavigation links={LINKS}/>

      <div className='flex flex-col gap-8 h-full'>
        <div className='flex flex-col gap-4'>
          <h1 className='text-h1'>Packs Gallery</h1>
          <span
            className='text-label text-text-label font-noto'>Explore public packs or manage your own creations.</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant={activeTab === TABS.COMMUNITY ? 'primary' : 'tertiary'}
              onClick={() => setActiveTab(TABS.COMMUNITY)}
            >
              Community
            </Button>
            <Button
              variant={activeTab === TABS.SAVED ? 'primary' : 'tertiary'}
              onClick={() => setActiveTab(TABS.SAVED)}
            >
              Saved
            </Button>
            <Button
              variant={activeTab === TABS.MY_CREATIONS ? 'primary' : 'tertiary'}
              onClick={() => setActiveTab(TABS.MY_CREATIONS)}
            >
              My creations
            </Button>
          </div>

          {activeTab === TABS.COMMUNITY && (
            <div className="flex items-center gap-[10px]">
              <span className="text-p font-noto">Sort by:</span>
              <DropDown
                value={sortOption}
                onChange={setSortOption}
                options={SORT_OPTIONS}
                width="w-[280px]"
              />
            </div>
          )}
        </div>

        <ul className='flex flex-col gap-8 w-full h-full relative'>
          {isLoading ? (
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <Spinner size='md'/>
            </div>
          ) : currentData.items.length > 0 ? (
            currentData.items.map((item) => {
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

              return <CardPack key={item.id} pack={mappedPack}/>;
            })
          ) : (
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <p className="font-noto text-p text-text-label self-center">No packs found.</p>
            </div>
          )}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 mt-4 self-center">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex items-center justify-center w-12 h-12 rounded-[12px] text-h2 transition-all shadow-buttons ${
                  currentPage === page
                    ? 'bg-brand-500'
                    : 'bg-white border border-surface hover:border-text-label'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default PacksGallery;
