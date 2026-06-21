import ModalLayout from "@/components/modals/ModalLayout.jsx";
import Leaderboard from "@/components/layouts/Leaderboard.jsx";
import { Button } from "@/components/buttons/Button.jsx";

export default function LeaderboardModal({ isHost = true, isOpen }) {
  const buttons = [
    { id: 1, variant: 'tertiary', label: 'Cancel', onClick: () => {} },
    { id: 2, variant: 'primary', label: 'Confirm changes', onClick: () => {} },
  ];

  return (
    <ModalLayout isOpen={isOpen}>
      <div className='bg-white w-[520px] rounded-[12px] flex flex-col pb-4 gap-2'>
        <Leaderboard isHost={isHost} />

        {isHost ? (
          <ul className='flex items-center justify-center gap-2.5 w-full'>
            {buttons.map((button) => (
              <li key={button.id}>
                <Button variant={button.variant}>
                  {button.label}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Button className='self-center'>
            Main Menu
          </Button>
        )}
      </div>
    </ModalLayout>
  );
}
