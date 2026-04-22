import profile from '@/assets/userProfile.svg';
import { Link } from "react-router-dom";

const PROFILE_LINK = '/profile';

const Header = () => {
  return (
    <header className='h-20 sticky top-0 bg-white z-50 flex items-center px-[10px] border-b border-surface justify-between'>
      <span className="font-zen text-logo">
        alias
      </span>

      <Link
        to={PROFILE_LINK}
        className="w-12 h-12 rounded-[12px] border-2 border-surface shadow-buttons flex items-center justify-center hover:bg-surface transition-colors"
      >
        <img src={profile} alt="Profile"/>
      </Link>
    </header>
  );
};

export default Header;
