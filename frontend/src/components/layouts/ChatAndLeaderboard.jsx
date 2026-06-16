import { useState } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import Chat from "@/components/layouts/Chat.jsx";

export default function ChatAndLeaderboard() {
  const types = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'queue', label: 'Queue' },
  ];

  const [activeType, setActiveType] = useState(types[0].id);

  return (
    <aside className='w-[358px] fixed right-0 top-0 h-screen p-8 flex flex-col justify-end gap-8 bg-neutral-bg'>
      <Chat/>

      <div className='bg-white rounded-[12px] p-4 gap-4 border border-surface w-full flex flex-col pt-0'>
        <NeutralSwitch
          options={types}
          activeId={activeType}
          onChange={setActiveType}
        />

        <ul className='w-full flex flex-col gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className={`w-full rounded-[12px] border 
            ${i === 0 ? 'border-brand-300' : 'border-surface'}
            flex items-center justify-between px-2 py-4 shadow-buttons`}>
              <div className='flex items-center gap-4'>
                <div className='size-6 rounded-full bg-team-green-dark'/>
                <span className='text-label font-noto'>Midnight Team</span>
              </div>

              <span className={`text-label font-noto
              ${i === 0 && 'text-brand-500'}`}>{5 - i} points</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
