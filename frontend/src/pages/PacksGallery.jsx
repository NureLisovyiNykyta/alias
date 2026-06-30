import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import CardPack from "@/components/cards/CardPack.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import DropDown from "@/components/inputs/DropDown.jsx";
import {
  getPublicPacks,
  getSavedPacks,
  getMyPacks
} from "@/api/card-packs";
import Spinner from "@/components/layouts/Spinner.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Packs Gallery", id: 2 },
];

const TABS = [
  { id: 'community', label: 'Community', fetchFn: getPublicPacks, queryKey: 'publicPacks' },
  { id: 'saved', label: 'Saved', fetchFn: getSavedPacks, queryKey: 'savedPacks' },
  { id: 'my_creations', label: 'My creations', fetchFn: getMyPacks, queryKey: 'myPacks' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'most_saved', label: 'Most Saved' },
];

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'All statuses' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DRAFT', label: 'Draft' },
];

const ITEMS_PER_PAGE = 20;

const PacksGallery = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0]);
  const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab.id, sortOption.id, statusOption.id]);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const queryParams = {
    limit: ITEMS_PER_PAGE,
    offset,
    ...(activeTab.id === 'community' && { sort_by: sortOption.id }),
    ...(activeTab.id === 'my_creations' && statusOption.id !== 'ALL' && { status: statusOption.id })
  };

  const { data: currentData = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: [activeTab.queryKey, queryParams],
    queryFn: () => activeTab.fetchFn(queryParams),
  });

  const totalPages = Math.ceil((currentData?.total || 0) / ITEMS_PER_PAGE);

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
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab.id === tab.id ? 'primary' : 'tertiary'}
                onClick={() => {
                  setActiveTab(tab)
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab.id === 'community' && (
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

          {activeTab.id === 'my_creations' && (
            <div className="flex items-center gap-[10px]">
              <span className="text-p font-noto">Status:</span>
              <DropDown
                value={statusOption}
                onChange={setStatusOption}
                options={STATUS_OPTIONS}
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
          ) : currentData.items?.length > 0 ? (
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

              return <CardPack key={item.id} pack={mappedPack} type={activeTab.id} />;
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
                onClick={() => {
                  setCurrentPage(page)
                }}
                className={`flex items-center justify-center w-12 h-12 rounded-[12px] text-h2 transition-all shadow-buttons ${
                  currentPage === page
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-surface hover:border-text-label text-text'
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
