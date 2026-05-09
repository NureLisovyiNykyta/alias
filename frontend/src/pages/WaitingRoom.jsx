import { useParams } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import cross from '@/assets/cross.svg';
import copy from '@/assets/darkCopy.svg';

const WaitingRoom = () => {
  const { id } = useParams();
  const isHost = false;

  return (
    <main className="grid grid-cols-[952px_1fr] w-full gap-16">
      <div className='flex flex-col w-[952px] gap-16'>
        <div className="flex flex-col w-full gap-4">
          <h1 className="text-h1">Game <b>{id}</b> lobby — Waiting for players</h1>
          <span className="text-label text-text-label font-noto">
            Need at least 4 players to start.
          </span>
        </div>

        <div className='flex flex-col w-full gap-4'>
          <div className='flex items-center w-full justify-between gap-2'>
            <h2 className='text-h2'>Choose your team</h2>
            <span className='text-label text-text-label font-noto'>4 teams available</span>
          </div>

          <ul className='w-full flex items-center justify-around gap-5'>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className='flex flex-col w-[220px] rounded-[12px] bg-green-200'>
                <div className='w-full h-13 rounded-t-[12px] py-[10px] px-[18px] flex items-center gap-4 bg-green-700'>
                  <p className='font-noto'>Midnight Team</p>
                  <span className='text-label text-white font-noto'>4 players</span>
                </div>

                <div className='flex flex-col items-center w-full py-6 gap-4'>
                  <ul className='w-full flex flex-col items-center px-[10px] gap-4'>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <li key={index} className='flex items-center px-2 justify-between w-full'>
                        <div className='flex items-center gap-4 min-w-0'>
                          <img src="" alt="Player Avatar" className='w-8 h-8 object-center rounded-full shrink-0'/>
                          <h2 className='text-h2 truncate'>PlayerPlayerPlayerPlayer</h2>
                        </div>

                        {isHost && (
                          <button
                            type='button'
                            className='w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0'
                          >
                            <img src={cross} alt="Remove Player"
                                 className='scale-80 hover:scale-100 transition-transform'/>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant='tertiary'
                    className='w-[184px]'
                  >
                    Join the team
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className='flex flex-col w-full justify-between gap-[70px]'>
        <div className='flex flex-col w-full gap-4'>
          <h2 className='text-h2'>Invite your friends</h2>

          <Button
            variant='tertiary'
            className='w-[189px]'
          >
            <img src={copy} alt="Copy"/>
            <span>524601</span>
          </Button>

          <span className='text-label text-text-label font-noto'>Share the connection code with your friends</span>

          <Button
            variant='tertiary'
            className='w-[189px]'
          >
            <img src={copy} alt="Copy"/>
            <span>Copy the link</span>
          </Button>

          <span className='text-label text-text-label font-noto'>Or simply share the link to join the game</span>
        </div>

        <div className='flex flex-col w-full gap-[10px] items-end'>
          {isHost ? <>
            <Button>
              Start the game
            </Button>

            <Button variant='tertiary'>
              Stop the game
            </Button>
          </> : (
            <Button>Leave the lobby</Button>
          )}
        </div>
      </aside>
    </main>
  );
};

export default WaitingRoom;
