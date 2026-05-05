import { Link } from 'react-router-dom';
import pin from '@/assets/pin.svg';
import grayPlus from '@/assets/grayPlus.svg';
import greenGlove from '@/assets/greenGlobe.svg';
import redGlove from '@/assets/redGlobe.svg';

const PINNED_LINKS = [
  { id: 1, label: 'How to play Alias?', path: '/start', color: 'bg-decorative-500' },
  { id: 2, label: 'Join our Discord', path: '/discord', color: 'bg-decorative-300' },
  { id: 3, label: 'Latest update', path: '/updates', color: 'bg-decorative-900' },
];

const MY_PACKS = [
  { id: 1, label: 'My favourite candles...', path: '/packs/1' },
  { id: 2, label: 'Pokemons', path: '/packs/2' },
  { id: 3, label: 'Dogs', path: '/packs/3' },
  { id: 4, label: 'English artists', path: '/packs/4' },
];

const MY_MAPS = [
  { id: 1, label: 'My favourite candles...', path: '/maps/1' },
  { id: 2, label: 'Pokemons', path: '/maps/2' },
  { id: 3, label: 'Dogs', path: '/maps/3' },
  { id: 4, label: 'English artists', path: '/maps/4' },
];

const Navigation = () => {
  return (
    <aside className="w-50 shrink-0 sticky top-20 py-8 flex flex-col gap-8 self-start border-r border-surface">
      <nav aria-label="Pinned Navigation">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <img src={pin} alt="" />
          </div>
          <h2 className="text-h2">Pinned</h2>
        </div>

        <ul className="flex flex-col px-2 gap-4">
          {PINNED_LINKS.map((link) => (
            <li key={link.id}>
              <Link
                to={link.path}
                className="flex items-center gap-2 rounded-lg hover:text-brand-500"
              >
                <span className={`w-6 h-6 rounded-[8px] ${link.color} shrink-0`} />
                <span className="font-noto text-p">
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="My Packs Navigation">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-h2">My packs</h2>
          <Link
            to="/new/card-pack"
            className="flex items-center gap-1 text-sm text-text-label hover:text-gray-600 transition-colors"
          >
            <img src={grayPlus} alt="" className="w-4 h-4" /> Create new
          </Link>
        </div>

        <ul className="flex flex-col px-2 gap-4">
          {MY_PACKS.map((link) => (
            <li key={link.id}>
              <Link
                to={link.path}
                className="flex items-center gap-2 rounded-lg hover:text-brand-500"
              >
                <span className="font-noto text-p truncate">
                  {link.label}
                </span>
              </Link>
            </li>
          ))}

          <li className="pt-2">
            <Link
              to="/gallery/packs"
              className="flex items-center gap-2 rounded-lg text-decorative-700 hover:text-decorative-900 transition-colors"
            >
              <img src={greenGlove} alt="" className="w-6 h-6 shrink-0" />
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
            <img src={grayPlus} alt="" className="w-4 h-4" /> Create new
          </Link>
        </div>

        <ul className="flex flex-col px-2 gap-4">
          {MY_MAPS.map((link) => (
            <li key={link.id}>
              <Link
                to={link.path}
                className="flex items-center gap-2 rounded-lg hover:text-brand-500"
              >
                <span className="font-noto text-p truncate">
                  {link.label}
                </span>
              </Link>
            </li>
          ))}

          <li className="pt-2">
            <Link
              to="/gallery/maps"
              className="flex items-center gap-2 rounded-lg text-orange-500 hover:text-orange-600 transition-colors"
            >
              <img src={redGlove} alt="" className="w-6 h-6 shrink-0" />
              <span className="font-noto text-p">Browse the gallery</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Navigation;
