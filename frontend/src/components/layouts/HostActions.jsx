import { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import editPen from '@/assets/editPen.svg';
import restart from '@/assets/restart.svg';
import game from '@/assets/gamePadNoBg.svg';
import gear from '@/assets/gear.svg';
import { Button } from "@/components/buttons/Button.jsx";
import LeaderboardModal from "@/components/modals/LeaderboardModal.jsx";
import GameConfirmModal from "@/components/modals/GameConfirmModal.jsx";

export default function HostActions() {
  const [activeModal, setActiveModal] = useState(null);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <Popover className="fixed left-6 bottom-6 z-50">
        {({ close }) => {
          const buttons = [
            {
              id: 1,
              variant: 'tertiary',
              icon: editPen,
              text: 'Edit score',
              onClick: () => {
                setActiveModal('leaderboard');
                close();
              }
            },
            {
              id: 2,
              variant: 'tertiary',
              icon: restart,
              text: 'Restart turn',
              onClick: () => {
                setActiveModal('restart');
                close();
              }
            },
            {
              id: 3,
              variant: 'primary',
              icon: game,
              text: 'End game',
              onClick: () => {
                setActiveModal('endGame');
                close();
              }
            },
          ];

          return (
            <>
              <Popover.Button className='flex items-center justify-center bg-white size-12 rounded-[12px] shadow-buttons outline-none hover:bg-surface transition-colors'>
                <img src={gear} alt="Open Host Actions"/>
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
                  <h2 className='text-h2'>Host Actions</h2>
                  <ul className='flex flex-col w-full gap-4'>
                    {buttons.map(button => (
                      <li key={button.id}>
                        <Button
                          variant={button.variant}
                          className='text-nowrap w-full'
                          onClick={button.onClick}
                        >
                          <img src={button.icon} alt=''/> {button.text}
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
          console.log("Turn restarted");
          closeModal();
        }}
      />

      <GameConfirmModal
        isOpen={activeModal === 'endGame'}
        onClose={closeModal}
        title="Are you sure you want to end game?"
        label="This action cannot be undone, and the game will end"
        onSuccess={() => {
          console.log("Game ended");
          closeModal();
        }}
      />
    </>
  );
}
