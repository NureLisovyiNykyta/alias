import arrow from '@/assets/navigationArrow.svg';
import { Link } from "react-router-dom";

const RowNavigation = ({ links }) => {
  return (
    <div className="flex items-center gap-1">
      {links.map(({ id, path, label }) => (
        path ? (
          <div className='flex items-center gap-1' key={id}>
            <Link
              to={path}
              className="text-p font-noto hover:text-blue-800 transition-colors"
            >
              {label}
            </Link>
            <img className="w-5 h-5" src={arrow} alt="Right Arrow" />
          </div>
        ) : (
          <span key={id} className="text-p font-noto">
            {label}
          </span>
        )
      ))}
    </div>
  );
};

export default RowNavigation;
