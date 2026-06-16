import user from '@/assets/userProfile.svg';

export default function TeamsDashboard() {
  return (
    <div className="fixed top-6 left-6 w-[410px] grid grid-cols-2 z-[100] gap-3">
      <div className="bg-white p-4 col-span-2 rounded-[12px] flex items-center justify-between">
        <div className='flex items-center gap-4'>
          <div className='flex items-center justify-center size-12 bg-team-green-dark shadow-lobby-modal rounded-full'>
            <h2 className='text-h2'>5</h2>
          </div>

          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Team's move</p>
            <span className='text-btn font-noto text-team-green-dark'>Green</span>
          </div>
        </div>

        <div className='flex items-center gap-4 mr-8'>
          <img src={user} alt='User Avatar' className='object-center size-12 shadow-lobby-modal rounded-full'/>
          <div className='flex flex-col gap-0.5'>
            <p className='font-noto'>Explainer</p>
            <span className='text-btn font-noto text-team-green-dark'>Alex</span>
          </div>
        </div>
      </div>

      <ul className='bg-white rounded-[12px] shadow-buttons p-4 flex flex-col gap-[10px] h-fit'>
        {Array.from({ length: 4 }).map((_, index) => (
          <li className='flex items-center gap-4'>
            <div className='flex items-center justify-center size-12 bg-team-green-dark shadow-lobby-modal rounded-full'>
              <h2 className='text-h2'>{index}</h2>
            </div>

            <div className='flex flex-col'>
              <span className='text-btn font-noto text-team-green-dark'>Green</span>
            </div>
          </li>
        ))}
      </ul>

      <ul className='bg-white rounded-[12px] shadow-buttons p-4 flex flex-col gap-[10px] h-fit'>
        {Array.from({ length: 5 }).map((_, index) => (
          <li className='flex items-center gap-4'>
            <img src={user} alt='User Avatar' className='object-center size-12 shadow-lobby-modal rounded-full'/>
            <span className='text-btn font-noto text-team-green-dark'>Alex</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
