import { useState } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import Chat from "@/components/layouts/Chat.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";

export const TeamList = () => {
  const { user } = useAuth();

  return (
    <ul className='w-[246px] rounded-[12px] bg-white p-4 gap-[10px] shadow-buttons flex flex-col'>
      {Array.from({length: 5}).map((_, i) => (
        <li key={i} className='flex items-center p-2 border border-surface shadow-buttons w-full gap-4 rounded-[12px]'>
          <img src={user?.avatar_url} alt={`User ${user?.nickname} Profile Picture`} className='rounded-full size-[30px] shadow-lobby-modal shrink-0'/>
          <span className='text-label font-noto text-team-green-dark'>{user?.nickname}</span>
        </li>
      ))}
    </ul>
  );
};

export default function ChatAndLeaderboard() {

  const types = {
    chat: [
      { id: 'general', label: 'General Chat' },
      { id: 'team', label: 'Team' },
    ],
    board: [
      { id: 'leaderboard', label: 'Leaderboard' },
      { id: 'queue', label: 'Queue' },
    ],
  };

  const [activeTypes, setActiveTypes] = useState({
    chat: types.chat[0].id,
    board: types.board[0].id,
  });

  const handleTypeChange = (section, newId) => {
    setActiveTypes((prev) => ({
      ...prev,
      [section]: newId
    }));
  };

  return (
    <aside className='w-[358px] fixed right-0 top-0 h-screen p-8 flex flex-col justify-end gap-8 bg-neutral-bg'>
      <Chat
        types={types.chat}
        activeType={activeTypes.chat}
        onChangeType={(id) => handleTypeChange('chat', id)}
      />

      <div className='bg-white rounded-[12px] p-4 gap-4 border border-surface w-full flex flex-col pt-0'>
        <NeutralSwitch
          options={types.board}
          activeId={activeTypes.board}
          onChange={(id) => handleTypeChange('board', id)}
          layoutId="boardSwitchIndicator"
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
