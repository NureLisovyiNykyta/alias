import profile from '@/assets/userProfile.svg';
import { Link } from "react-router-dom";
import { Button } from "@/components/Button.jsx";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import ProfileSettings from "@/components/ProfileSettings.jsx";

const LINKS = [
  '/auth/sign-in',
];

const Header = () => {
  return (
    <header className='h-20 sticky top-0 bg-white z-50 flex items-center px-5 border-b border-surface justify-between'>
      <span className="font-zen text-logo">
        alias
      </span>

      <div className='flex items-center gap-3'>
        <Popover className="relative">
          <Popover.Button
            className="w-12 h-12 rounded-[12px] border-2 border-surface shadow-buttons flex items-center justify-center hover:bg-surface transition-colors focus:outline-none"
          >
            <img src={profile} alt="Profile"/>
          </Popover.Button>

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
              <ProfileSettings />
            </Popover.Panel>
          </Transition>
        </Popover>

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
