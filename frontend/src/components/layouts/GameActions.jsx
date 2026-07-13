import { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useNavigate } from "react-router-dom";
import editPen from '@/assets/editPen.svg';
import restart from '@/assets/restart.svg';
import game from '@/assets/gamePadNoBg.svg';
import gear from '@/assets/gear.svg';
import { Button } from "@/components/buttons/Button.jsx";
import LeaderboardModal from "@/components/modals/LeaderboardModal.jsx";
import GameConfirmModal from "@/components/modals/GameConfirmModal.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useLeaveRoomMutation } from "@/api/lobby.js";
import leave from '@/assets/openSideBar.svg';
import menu from '@/assets/navigationArrow.svg';

export default function GameActions({ isHost }) {
  const [activeModal, setActiveModal] = useState(null);
  const closeModal = () => setActiveModal(null);

  const navigate = useNavigate();
  const { sendMessage, roomData, setRoom } = useLobby();
  const { user } = useAuth();
  const { showNotification, closeNotification } = useNotification();

  const roomCode = roomData?.room_code;

  const { mutate: leaveRoom, isPending: isLeavingRoom } = useLeaveRoomMutation({
    onSuccess: () => {
      setRoom(null);
      showNotification({
        title: "Lobby Left!",
        message: "You will soon be redirected to the main page.",
        isSuccess: true,
      });

      navigate('/');

      setTimeout(() => {
        closeNotification();
      }, 1500);
    },
    onError: (data) => {
      showNotification({
        title: "Error",
        message: `Failed to leave the lobby. ${data.response?.data.detail || ''}`,
        isSuccess: false,
      });
    },
  });

  const handleLeaveRoom = () => {
    const guestId = localStorage.getItem("guest_id");
    const playerId = user?.id || guestId;
    leaveRoom({ roomCode, playerId });
    closeModal();
  };

  const handleMainMenu = () => {
    navigate('/');
    closeModal();
  };

  return (
    <>
      <Popover className="fixed left-6 bottom-6 z-50">
        {({ close }) => {
          const allButtons = [
            {
              id: 'main-menu',
              variant: 'tertiary',
              icon: menu,
              text: 'Main Menu',
              show: true,
              onClick: () => {
                handleMainMenu();
                close();
              }
            },
            {
              id: 'edit-score',
              variant: 'tertiary',
              icon: editPen,
              text: 'Edit Score',
              show: isHost,
              onClick: () => {
                setActiveModal('leaderboard');
                close();
              }
            },
            {
              id: 'restart-turn',
              variant: 'tertiary',
              icon: restart,
              text: 'Restart Turn',
              show: isHost,
              onClick: () => {
                setActiveModal('restart');
                close();
              }
            },
            {
              id: 'leave-room',
              variant: isHost ? 'tertiary' : 'primary',
              icon: leave,
              text: 'Leave Room',
              show: !isHost,
              onClick: () => {
                setActiveModal('leaveRoom');
                close();
              }
            },
            {
              id: 'end-game',
              variant: 'primary',
              icon: game,
              text: 'End Game',
              show: isHost,
              onClick: () => {
                setActiveModal('endGame');
                close();
              }
            },
          ];

          const visibleButtons = allButtons.filter(btn => btn.show);

          return (
            <>
              <Popover.Button className='flex items-center justify-center bg-white size-12 rounded-[12px] shadow-buttons outline-none hover:bg-surface transition-colors'>
                <img src={gear} alt="Open Game Actions"/>
              </Popover.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-2"
              >
                <Popover.Panel className='absolute bottom-full mb-4 left-0 w-[225px] bg-white rounded-[12px] shadow-buttons px-4 py-4 flex flex-col gap-4'>
                  <h2 className='text-h2'>Game Actions</h2>
                  <ul className='flex flex-col w-full gap-4'>
                    {visibleButtons.map(button => (
                      <li key={button.id}>
                        <Button
                          variant={button.variant}
                          className='text-nowrap w-full'
                          onClick={button.onClick}
                          disabled={button.id === 'leave-room' && isLeavingRoom}
                        >
                          {button.icon && <img src={button.icon} className={button.id === 'main-menu' ? 'rotate-180 scale-170' : ''} alt={button.id}/>}
                          {button.text}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Popover.Panel>
              </Transition>
            </>
          );
        }}
      </Popover>

      <LeaderboardModal
        isHost={true}
        isOpen={activeModal === 'leaderboard'}
        onClose={closeModal}
      />

      <GameConfirmModal
        isOpen={activeModal === 'restart'}
        onClose={closeModal}
        title="Are you sure you want to restart turn?"
        label="This action cannot be undone, and the turn will start again"
        onSuccess={() => {
          sendMessage({ type: 'restart_turn' });
          closeModal();
        }}
      />

      <GameConfirmModal
        isOpen={activeModal === 'endGame'}
        onClose={closeModal}
        title="Are you sure you want to end game?"
        label="This action cannot be undone, and the game will end"
        onSuccess={() => {
          sendMessage({ type: 'end_game' });
          closeModal();
        }}
      />

      <GameConfirmModal
        isOpen={activeModal === 'leaveRoom'}
        onClose={closeModal}
        title="Are you sure you want to leave?"
        label="You will be disconnected from the current game."
        onSuccess={handleLeaveRoom}
      />
    </>
  );
}
