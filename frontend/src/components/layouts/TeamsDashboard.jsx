import { useAuth } from "@/contexts/AuthContext.jsx";

export default function TeamsDashboard() {
  const { user } = useAuth();

  return (
    <div className="fixed top-6 left-6 w-[350px] grid grid-cols-2 z-[100] gap-3">
      <div className="bg-white p-4 col-span-2 rounded-[12px] flex items-center justify-between">
        <div className='flex items-center gap-4 h-full'>
          <div className='h-full w-2 bg-team-green-dark shadow-lobby-modal rounded-xs'/>

          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Team's move</p>
            <span className='text-btn font-noto text-team-green-dark'>Green</span>
          </div>
        </div>

        <div className='flex items-center gap-4 mr-8'>
          <img src={user?.avatar_url} alt='User Avatar' className='object-center size-12 shadow-lobby-modal rounded-full'/>
          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Explainer</p>
            <span className='text-btn font-noto text-team-green-dark'>{user?.nickname}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
