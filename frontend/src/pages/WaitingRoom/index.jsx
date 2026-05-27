import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import cross from '@/assets/cross.svg';
import copy from '@/assets/darkCopy.svg';
import plus from '@/assets/plus.svg';
import { useCloseRoomMutation, useCreateTeamMutation, useDeleteTeamMutation } from "@/api/lobby.js";
import Spinner from "@/components/layouts/Spinner.jsx";
import { useGameSocket } from "./useGameSockets.js";
import { TEAM_COLORS, TEAM_BG_MAP } from "./constants.js";
import { parseUpperCase } from "@/utils/parseUpperCase.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const WaitingRoom = () => {
  const { code: roomCode } = useParams();
  const { roomData } = useGameSocket(roomCode);
  const { user } = useAuth();

  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const { mutate: createTeam, isPending: isCreatingTeam } = useCreateTeamMutation();
  const { mutate: closeRoom, isPending: isClosingRoom } = useCloseRoomMutation({
    onSuccess: (data) => {
      showNotification({
        title: "Lobby Closed!",
        message: "Your lobby has been successfully closed. Redirecting.",
        isSuccess: true,
      });

      setTimeout(() => {
        navigate('/');
      }, 1200);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to close the lobby.",
        isSuccess: false,
      });
    },
  });

  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeamMutation({
    onSuccess: (data) => {
      showNotification({
        title: "Team Removed!",
        message: "Team has been successfully removed.",
        isSuccess: true,
      });
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to delete the team. Try again.",
        isSuccess: false,
      });
    },
  });

  const isHost = roomData?.host_id === user?.id;
  const teamsList = roomData?.teams ? Object.values(roomData.teams) : [];
  const maxTeams = roomData?.settings?.max_teams || 4;
  const canCreateTeam = teamsList.length < maxTeams && isHost;

  // Keep track of which team header is currently being hovered
  const [hoveredTeamId, setHoveredTeamId] = useState(null);

  const getRandomColor = () => {
    const usedColors = teamsList.map(t => t.color);
    const availableColors = TEAM_COLORS.filter(color => !usedColors.includes(color));
    const pool = availableColors.length > 0 ? availableColors : TEAM_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleCreateTeam = () => {
    const randomColor = getRandomColor();

    createTeam({
      roomCode: roomCode,
      teamData: {
        name: `Team ${parseUpperCase(randomColor)}`,
        color: randomColor
      }
    });
  };

  if (!roomData) {
    return <div className="flex w-full h-full justify-center items-center"><Spinner/></div>;
  }

  return (
    <main className="grid grid-cols-[952px_1fr] w-full gap-16">
      <div className='flex flex-col w-[952px] gap-16'>
        <div className="flex flex-col w-full gap-4">
          <h1 className="text-h1">Game <b>{roomData.room_code || id}</b> lobby — Waiting for players</h1>
          <span className="text-label text-text-label font-noto">
            Need at least {roomData.settings?.min_teams || 2} teams to start.
          </span>
        </div>

        <div className='flex flex-col w-full gap-4'>
          <div className='flex items-center w-full justify-between gap-2'>
            <h2 className='text-h2'>
              {isHost ? 'Add at least two teams to start the game' :
                teamsList.length === 0 ? 'Waiting for host to add the teams...' : 'Choose your team'}
            </h2>
            <span className='text-label text-text-label font-noto'>
              {teamsList.length} / {maxTeams} teams
            </span>
          </div>

          <ul className='w-full flex items-center justify-start flex-wrap gap-5 overflow-hidden py-2'>
            <AnimatePresence>
              {teamsList.map((team) => (
                <motion.li
                  key={team.team_id}
                  initial={{ opacity: 0, x: -50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                  className='flex flex-col w-[220px] rounded-[12px] p-4 gap-4'
                  style={{ backgroundColor: TEAM_BG_MAP[team.color] }}
                >
                  <div
                    className="flex justify-between items-center h-6 overflow-hidden relative"
                    onMouseEnter={() => isHost && setHoveredTeamId(team.team_id)}
                    onMouseLeave={() => isHost && setHoveredTeamId(null)}
                  >
                    <span className="font-bold shrink-0">{team.name}</span>

                    <div className="relative flex items-center justify-end w-full h-full">
                      <AnimatePresence mode="wait">
                        {hoveredTeamId === team.team_id && isHost ? (
                          <motion.button
                            key="delete-btn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.1 }}
                            onClick={() => {
                              deleteTeam({ roomCode: roomCode, teamId: team.team_id })
                            }}
                            disabled={isDeletingTeam}
                            className="absolute right-0"
                          >
                            <img src={cross} alt="cross" className='scale-80'/>
                          </motion.button>
                        ) : (
                          <motion.span
                            key="player-count"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="text-sm absolute right-0"
                          >
                            {team.player_ids?.length || 0} player{team.player_ids?.length !== 1 && 's'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className='mt-auto self-center'>
                    <Button className='w-[184px]' variant="tertiary">
                      Join the team
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>

            {canCreateTeam && (
              <li className={`flex items-center justify-center ${teamsList.length === 0 && 'w-[222px]'}`}>
                <Button
                  onClick={handleCreateTeam}
                  disabled={isCreatingTeam}
                  style={{ backgroundColor: TEAM_BG_MAP[getRandomColor()], color: 'var(--color-text)' }}
                  className="w-full shadow-sm"
                >
                  {isCreatingTeam ? <>
                    <Spinner size='sm' color='border-text'/>
                    Creating
                  </> : <>
                    <img src={plus} alt="Plus"/>
                    {teamsList.length === 0 && ('Create a new team')}
                  </>
                  }
                </Button>
              </li>
            )}
          </ul>
        </div>
      </div>

      <aside className='flex flex-col w-full justify-between gap-[70px]'>
        <div className='flex flex-col w-full gap-4'>
          <h2 className='text-h2'>Invite your friends</h2>

          <Button variant='tertiary' className='w-[189px]'>
            <img src={copy} alt="Copy"/>
            <span>{roomData.room_code}</span>
          </Button>

          <span className='text-label text-text-label font-noto'>
            Share the connection code with your friends
          </span>

          <Button variant='tertiary' className='w-[189px]'>
            <img src={copy} alt="Copy"/>
            <span>Copy the link</span>
          </Button>

          <span className='text-label text-text-label font-noto'>
            Or simply share the link to join the game
          </span>
        </div>

        <div className='flex flex-col w-full gap-[10px] items-end'>
          {isHost ? (
            <>
              <Button disabled={teamsList.length < (roomData.settings?.min_teams || 2)}>
                Start the game
              </Button>
              <Button
                onClick={() => closeRoom(roomCode)}
                disabled={isClosingRoom}
                variant='tertiary'
              >
                Stop the game
              </Button>
            </>
          ) : (
            <span className="text-label text-text-label">Waiting for host to start...</span>
          )}
        </div>
      </aside>
    </main>
  );
};

export default WaitingRoom;
