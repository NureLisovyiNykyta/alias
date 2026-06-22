import { useState } from "react";
import Chat from "@/components/layouts/Chat.jsx";
import Leaderboard from "@/components/layouts/Leaderboard.jsx";
import { useUI } from "@/contexts/UIContext.jsx";
import closeSideBar from "@/assets/openSideBar.svg";
import openSideBar from "@/assets/closeSideBar.svg";

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
        <img src={openSideBar} alt="Open Menu" className="size-4" />
      </button>
    );
  }

  return (
    <aside className='w-[358px] fixed right-0 top-0 h-screen p-4 flex flex-col justify-end gap-4 bg-neutral-bg z-40 shadow-xl'>
      <button
        onClick={toggleBoard}
        className="absolute top-2 -left-12 p-3 bg-white rounded-[12px] shadow-buttons hover:bg-surface transition-colors cursor-pointer z-1000"
      >
        <img src={closeSideBar} alt="Close Board" className="size-4" />
      </button>

      <Chat
        types={types.chat}
        activeType={activeTypes.chat}
        onChangeType={(id) => handleTypeChange('chat', id)}
      />

      <Leaderboard
        types={types.board}
        activeType={activeTypes.board}
        onChangeType={(id) => handleTypeChange('board', id)}
      />
    </aside>
  );
}
