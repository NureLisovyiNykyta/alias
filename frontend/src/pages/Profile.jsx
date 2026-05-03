import profile from '@/assets/profile.png';
import upload from '@/assets/upload.svg';
import email from '@/assets/darkMail.svg';
import gamepad from "@/assets/gamepad.svg";
import copy from "@/assets/darkCopy.svg";
import cross from "@/assets/redCross.svg";
import Input from "@/components/Input.jsx";
import { Button } from "@/components/Button.jsx";
import RowNavigation from "@/components/RowNavigation.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Accounts details", id: 2 },
];

const Profile = () => {
  const { user } = useAuth();

  return (
    <main className="flex flex-col w-full gap-5">
      <RowNavigation links={LINKS}/>

      <h1 className='text-h1'>Account details</h1>

      <div className='flex gap-8 w-full'>
        <div
          style={{ backgroundImage: `url(${profile})` }}
          className='w-[310px] h-[310px] flex flex-col justify-end rounded-[16px] bg-cover bg-center'
        >
          <button
            className='flex items-center justify-center w-full rounded-b-[12px] gap-2 py-2 bg-surface'
          >
            <img src={upload} alt=""/>
            <span className='text-label font-noto'>Change profile picture</span>
          </button>
        </div>

        <div className='flex flex-col gap-6'>
          <ul className='flex items-center gap-8'>
            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Playing on Alias.com since</span>
              <p className='font-noto text-p'>January, 2026</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Finished</span>
              <p className='font-noto text-p'>142 games</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>E-mail</span>
              <div className='flex items-center gap-2'>
                <img src={email} alt=""/>
                <p className='font-noto text-p'>{user?.email}</p>
              </div>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Username</span>
              <div className='flex items-center gap-2'>
                <img src={gamepad} alt=""/>
                <p className='font-noto text-p'>{user?.username}</p>
              </div>
            </li>
          </ul>


          <Input
            label='Display name'
            type='text'
            placeholder='Sasha'
            id='name'
          />

          <Input
            label='Change password'
            type='password'
            placeholder='***************'
            id='password'
          />

          <div className='flex gap-6'>
            <Button
              variant='secondary'
            >
              <div className='flex items-center gap-2'>
                <img src={copy} alt=""/>
                <span>Copy link to my profile</span>
              </div>
            </Button>

            <Button
              variant='tertiary'
            >
              <div className='flex items-center gap-2'>
                <img src={cross} alt=""/>
                <span className='text-text-warning'>Delete my account permanently</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Profile;
