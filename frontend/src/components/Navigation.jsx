import { Link } from 'react-router-dom';
import pin from '@/assets/pin.svg';

const PINNED_LINKS = [
  { id: 1, label: 'How to start?', path: '/start', color: 'bg-decorative-500' },
  { id: 2, label: 'Join our Discord', path: '/discord', color: 'bg-decorative-300' },
  { id: 3, label: 'Latest update', path: '/updates', color: 'bg-decorative-900' },
];

const Navigation = () => {
  return (
    <aside className="w-50 shrink-0 sticky top-20 py-8 flex flex-col gap-8 self-start border-r border-surface">
      <nav aria-label="Sidebar Navigation">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className='w-6 h-6 flex items-center justify-center'>
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
    </aside>
  );
};

export default Navigation;
