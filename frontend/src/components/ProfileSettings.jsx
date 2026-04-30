import profile from '@/assets/userProfile.svg';
import signOut from '@/assets/signOut.svg';
import { Link } from "react-router-dom";
import { Popover } from '@headlessui/react';

const ProfileSettings = () => {
  return (
    <div className='w-fit h-[160px] rounded-[12px] border-2 border-surface bg-white shadow-buttons flex flex-col p-[15px] gap-5'>
      <div className='w-full flex flex-col pb-2 border-b border-text-label'>
        <span className='font-noto text-p'>Aleks Atamanova</span>
        <span className='font-noto text-label text-text-label'>atamanova.a@gmail.com</span>
      </div>

      <div className='flex flex-col gap-4'>
        <Popover.Button
          as={Link}
          className='flex items-center gap-2 focus:outline-none'
          to={'/profile'}
        >
          <img src={profile} alt="Profile"/>
          <span className='text-label font-noto text-black'>My Profile</span>
        </Popover.Button>

        <Popover.Button
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
