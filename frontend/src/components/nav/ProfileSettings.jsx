import profile from '@/assets/userProfile.svg';
import signOut from '@/assets/signOut.svg';
import { Link } from "react-router-dom";
import { Popover } from '@headlessui/react';
import { useAuth } from "@/contexts/AuthContext.jsx";

const PROFILE_LINK = '/me';

const ProfileSettings = () => {
  const { user, logout } = useAuth();

  return (
    <div
      className='w-[240px] rounded-[12px] border-2 border-surface bg-white shadow-buttons flex flex-col p-[15px] gap-5'
    >
      <div className='w-full flex flex-col pb-2 border-b border-text-label'>
        <span className='font-noto text-p truncate'>{user?.username}</span>
        <span className='font-noto text-label text-text-label truncate'>{user?.email}</span>
      </div>

      <div className='flex flex-col gap-4'>
        <Popover.Button
          as={Link}
          className='flex items-center gap-2 focus:outline-none'
          to={PROFILE_LINK}
        >
          <img src={profile} alt="My Profile"/>
          <span className='text-label font-noto text-black'>My Profile</span>
        </Popover.Button>

        <Popover.Button
          onClick={logout}
          className='flex items-center gap-2 focus:outline-none'
        >
          <img src={signOut} alt="Profile"/>
          <span className='text-label font-noto text-black'>Sign Out</span>
        </Popover.Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
