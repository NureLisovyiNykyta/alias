import profile from '@/assets/userProfile.svg';
import gamepad from "@/assets/gamepad.svg";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import { formatPackDate } from "@/utils/parseTime.js";
import { useParams } from "react-router-dom";
import { useUserByUsernameQuery } from "@/api/user.js";
import Spinner from "@/components/layouts/Spinner.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Accounts details", id: 2 },
];

const PublicProfile = () => {
  const { username } = useParams();
  const { data: user, isLoading } = useUserByUsernameQuery(username);

  if (isLoading) {
    return (
      <main className="flex items-center justify-center w-full h-full gap-5">
        <Spinner size="lg" />
        <h2 className='text-h2 text-text-label'>Loading User Info</h2>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full gap-5">
      <RowNavigation links={LINKS}/>

      <h1 className='text-h1'><b>{user?.nickname}</b> details</h1>

      <div className='flex gap-8 w-full'>
        <div
          style={{ backgroundImage: `url(${user?.avatar_url ?? profile})` }}
          className='size-[310px] flex flex-col justify-end rounded-[16px] bg-cover bg-center'
        />

        <ul className='flex flex-col gap-[22px]'>
          <li className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Playing Alias since</span>
            <p className='font-noto text-p'>{formatPackDate(user?.created_at)}</p>
          </li>

          <li className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Finished</span>
            <p className='font-noto text-p'>{user?.games_played} games</p>
          </li>

          <li className='flex flex-col gap-2'>
            <span className='text-label text-text-label font-noto'>Username</span>
            <div className='flex items-center gap-2'>
              <img src={gamepad} alt=""/>
              <p className='font-noto text-p'>{user?.username}</p>
            </div>
          </li>
        </ul>
      </div>
    </main>
  );
};

export default PublicProfile;
