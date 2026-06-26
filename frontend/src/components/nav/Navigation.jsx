import { useState } from 'react';
import { Link } from 'react-router-dom';
import pin from '@/assets/pin.svg';
import grayPlus from '@/assets/grayPlus.svg';
import greenGlove from '@/assets/greenGlobe.svg';
import redGlove from '@/assets/redGlobe.svg';
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useMyPacksQuery } from "@/api/card-packs.js";
import { useMyMapsQuery } from "@/api/maps.js";
import Spinner from "@/components/layouts/Spinner.jsx";

const PINNED_LINKS = [
  { id: 1, label: 'How to play Alias?', path: '/start', color: 'bg-decorative-500' },
  { id: 2, label: 'Join our Discord', path: 'https://discord.gg/2xsU4arUnX', color: 'bg-decorative-300' },
  { id: 3, label: 'Latest update', path: '/updates', color: 'bg-decorative-900' },
];

const Navigation = () => {
  const { isAuthenticated } = useAuth();

  const [showAllPacks, setShowAllPacks] = useState(false);
  const [showAllMaps, setShowAllMaps] = useState(false);

  const { data: packsData, isLoading: isPacksLoading } = useMyPacksQuery(
    showAllPacks ? {} : { limit: 4 },
    { enabled: isAuthenticated }
  );

  const { data: mapsData, isLoading: isMapsLoading } = useMyMapsQuery(
    showAllMaps ? {} : { limit: 4 },
    { enabled: isAuthenticated }
  );

  const myPacks = packsData?.items || [];
  const myMaps = mapsData?.items || [];

  return (
    <aside className="w-50 shrink-0 sticky top-20 py-8 flex flex-col gap-8 self-start border-r border-surface">
      <nav aria-label="Pinned Navigation">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <img src={pin} alt=""/>
          </div>
          <h2 className="text-h2">Pinned</h2>
        </div>

        <ul className="flex flex-col px-2 gap-4">
          {PINNED_LINKS.map((link) => {
            const isDiscord = link.id === 2;
            const className = "flex items-center gap-2 rounded-lg hover:text-brand-500";

            return (
              <li key={link.id}>
                {isDiscord ? (
                  <a
                    href={link.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    <span className={`w-6 h-6 rounded-[8px] ${link.color} shrink-0`}/>
                    <span className="font-noto text-p">
              {link.label}
            </span>
                  </a>
                ) : (
                  <Link
                    to={link.path}
                    className={className}
                  >
                    <span className={`w-6 h-6 rounded-[8px] ${link.color} shrink-0`}/>
                    <span className="font-noto text-p">
              {link.label}
            </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {isAuthenticated && <>
        <nav aria-label="My Packs Navigation">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-h2">My packs</h2>
            <Link
              to="/new/card-pack"
              className="flex items-center gap-1 text-sm text-text-label hover:text-gray-600 transition-colors"
            >
              <img src={grayPlus} alt="" className="w-4 h-4 scale-80"/> Create new
            </Link>
          </div>

          <ul className="flex flex-col px-2 gap-4">
            {isPacksLoading ? (<Spinner size='sm'/>) : (
              myPacks.map((pack) => (
                <li key={pack.id}>
                  <Link
                    to={`/card-pack/${pack.id}`}
                    className="flex items-center gap-2 rounded-lg hover:text-brand-500"
                  >
                    <span className="font-noto text-p truncate">
                      {pack.name}
                    </span>
                  </Link>
                </li>
              ))
            )}

            {packsData?.total > 4 && (
              <li>
                <button
                  onClick={() => setShowAllPacks(!showAllPacks)}
                  className="text-label text-text-label font-noto hover:text-brand-500 transition-colors text-left"
                >
                  {showAllPacks ? 'Show less' : 'Show all'}
                </button>
              </li>
            )}

            <li className="pt-2">
              <Link
                to="/gallery/packs"
                className="flex items-center gap-2 rounded-lg text-decorative-700 hover:text-decorative-900 transition-colors"
              >
                <img src={greenGlove} alt="" className="w-6 h-6 shrink-0"/>
                <span className="font-noto text-p">Browse the gallery</span>
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="My Maps Navigation">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-h2">My maps</h2>
            <Link
              to="/new/map"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <img src={grayPlus} alt="" className="w-4 h-4 scale-80"/> Create new
            </Link>
          </div>

          <ul className="flex flex-col px-2 gap-4">
            {isMapsLoading ? (<Spinner size='sm'/>) : (
              myMaps.map((map) => (
                <li key={map.id}>
                  <Link
                    to={`/map/${map.id}`}
                    className="flex items-center gap-2 rounded-lg hover:text-brand-500"
                  >
                    <span className="font-noto text-p truncate">
                      {map.name}
                    </span>
                  </Link>
                </li>
              ))
            )}

            {mapsData?.total > 4 && (
              <li>
                <button
                  onClick={() => setShowAllMaps(!showAllMaps)}
                  className="text-label text-text-label font-noto hover:text-brand-500 transition-colors text-left"
                >
                  {showAllMaps ? 'Show less' : 'Show all'}
                </button>
              </li>
            )}

            <li className="pt-2">
              <Link
                to="/gallery/maps"
                className="flex items-center gap-2 rounded-lg text-orange-500 hover:text-orange-600 transition-colors"
              >
                <img src={redGlove} alt="" className="w-6 h-6 shrink-0"/>
                <span className="font-noto text-p">Browse the gallery</span>
              </Link>
            </li>
          </ul>
        </nav>
      </>}
    </aside>
  );
};

export default Navigation;
