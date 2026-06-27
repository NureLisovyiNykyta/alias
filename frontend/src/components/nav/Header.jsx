import profile from '@/assets/userProfile.svg';
import { Link } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import ProfileSettings from "@/components/nav/ProfileSettings.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";

const LINKS = [
  '/auth/sign-in',
  '/'
];

export default function Header() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <header className='h-20 sticky top-0 bg-white z-50 flex items-center px-5 border-b border-surface justify-between'>
      <Link to={LINKS[1]} className="font-zen text-logo">
        alias
      </Link>

      {isAuthenticated ?
        <Popover className="relative">
          {isLoading ? <Spinner size='sm' /> : (
            <Popover.Button
              disabled={isLoading}
              className="w-12 h-12 rounded-[12px] border-2 border-surface shadow-buttons flex items-center justify-center hover:bg-surface transition-colors focus:outline-none"
            >
              <img className={`${user.avatar_url ? 'rounded-full size-8 shrink-0' : ''}`} src={user.avatar_url ?? profile} alt="My Profile"/>
            </Popover.Button>
          )}

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 mt-2">
              <ProfileSettings/>
            </Popover.Panel>
          </Transition>
        </Popover>
        :
        <Button
          as={Link}
          to={LINKS[0]}
        >
          Sign In
        </Button>
      }
    </header>
  );
}
