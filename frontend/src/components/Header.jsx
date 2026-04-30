import profile from '@/assets/userProfile.svg';
import { Link } from "react-router-dom";
import { Button } from "@/components/Button.jsx";

const LINKS = [
  '/auth/sign-in',
  '/profile',
];

const Header = () => {
  return (
    <header className='h-20 sticky top-0 bg-white z-50 flex items-center px-5 border-b border-surface justify-between'>
      <span className="font-zen text-logo">
        alias
      </span>

      <div className='flex items-center gap-3'>
        <Link
          to={LINKS[1]}
          className="w-12 h-12 rounded-[12px] border-2 border-surface shadow-buttons flex items-center justify-center hover:bg-surface transition-colors"
        >
          <img src={profile} alt="Profile"/>
        </Link>

        <Button
          as={Link}
          to={LINKS[0]}
        >
          Sign In
        </Button>
      </div>
    </header>
  );
};

export default Header;
