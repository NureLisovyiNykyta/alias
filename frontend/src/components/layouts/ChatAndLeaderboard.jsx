import { useState } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import Chat from "@/components/layouts/Chat.jsx";
import { useUI } from "@/contexts/UIContext.jsx";
import burgerMenu from "@/assets/burgerMenu.svg";
import cross from "@/assets/cross.svg";

export default function ChatAndLeaderboard() {
  const { isBoardOpen, toggleBoard } = useUI();

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
    setActiveTypes((prev) => ({ ...prev, [section]: newId }));
  };

  if (!isBoardOpen) {
    return (
      <button
        onClick={toggleBoard}
        className="fixed top-6 right-6 z-50 bg-white p-3 rounded-[12px] shadow-buttons hover:bg-surface transition-colors cursor-pointer"
      >
        <img src={burgerMenu} alt="Open Menu" className="size-4" />
      </button>
    );
  }

  return (
    <aside className='w-[358px] fixed right-0 top-0 h-screen p-8 pt-12 flex flex-col justify-end gap-8 bg-neutral-bg z-40 shadow-xl'>
      <button
        onClick={toggleBoard}
        className="absolute top-2 left-8 p-2 bg-white rounded-[12px] shadow-buttons hover:bg-surface transition-colors cursor-pointer"
      >
        <img src={cross} alt="Close Board" className="size-4" />
      </button>

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
