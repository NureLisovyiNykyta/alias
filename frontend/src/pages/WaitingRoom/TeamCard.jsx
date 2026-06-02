import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/buttons/Button.jsx";
import cross from '@/assets/cross.svg';
import { TEAM_BG_MAP, TEAM_BG_MAP_DARK } from "./constants.js";
import { useJoinTeamMutation, useKickPlayerMutation, useLeaveTeamMutation } from "@/api/lobby.js";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";

const TeamCard = ({ team, roomCode, isHost, onDeleteTeam, isDeletingTeam, roomPlayers, currentUser }) => {
  const [hoveredTeam, setHoveredTeam] = useState(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState(null);
  const { showNotification } = useNotification();

  const { mutate: joinTeam, isPending: isJoining } = useJoinTeamMutation({
    onError: () => {
      showNotification({ title: "Error", message: "Failed to join team.", isSuccess: false });
    }
  });

  const { mutate: kickPlayer } = useKickPlayerMutation({
    onError: () => {
      showNotification({ title: "Error", message: "Failed to kick player.", isSuccess: false });
    }
  });

  const { mutate: leaveTeam, isPending: isLeaving } = useLeaveTeamMutation({
    onError: () => {
      showNotification({ title: "Error", message: "Failed to leave team.", isSuccess: false });
    }
  });

  const guestId = localStorage.getItem("guest_id");

  const handleJoin = () => {
    joinTeam({ roomCode, teamId: team.team_id, guestId });
  };

  const handleLeave = () => {
    const playerId = currentUser?.id || guestId;
    leaveTeam({ roomCode, teamId: team.team_id, playerId });
  };

  const players = team.player_ids?.map(id => roomPlayers[id]).filter(Boolean) || [];

  const isUserInTeam = players.some(p => p.user_id === currentUser?.id || p.user_id === guestId);

  return (
    <motion.li
      initial={{ opacity: 0, x: -50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className='flex flex-col w-[220px] rounded-[12px]'
      style={{ backgroundColor: TEAM_BG_MAP[team.color] }}
    >
      <div
        className='w-full h-[52px] rounded-t-[12px] py-[10px] px-[18px] flex items-center justify-between gap-4 transition-colors relative overflow-hidden'
        style={{ backgroundColor: TEAM_BG_MAP_DARK[team.color] }}
        onMouseEnter={() => isHost && setHoveredTeam(true)}
        onMouseLeave={() => isHost && setHoveredTeam(false)}
      >
        <p className='font-noto font-bold truncate max-w-[120px] shrink-0 text-text'>{team.name}</p>

        <div className="relative flex items-center justify-end w-full h-full">
          <AnimatePresence mode="wait">
            {hoveredTeam && isHost ? (
              <motion.button
                key="delete-team-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
                onClick={() => onDeleteTeam(team.team_id)}
                disabled={isDeletingTeam}
                className="absolute right-0 flex items-center justify-center"
              >
                <img src={cross} alt="cross" className='scale-80 transition-transform'/>
              </motion.button>
            ) : (
              <motion.span
                key="player-count"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
                className="text-sm absolute right-0 text-white font-noto whitespace-nowrap"
              >
                {players.length} player{players.length !== 1 && 's'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className='flex flex-col items-center w-full py-6 gap-4'>
        <ul className='w-full flex flex-col items-center px-[10px] gap-4 min-h-[160px]'>
          <AnimatePresence>
            {players.map((player) => (
              <motion.li
                key={player.user_id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className='flex items-center px-2 justify-between w-full'
                onMouseEnter={() => isHost && setHoveredPlayerId(player.user_id)}
                onMouseLeave={() => isHost && setHoveredPlayerId(null)}
              >
                <div className='flex items-center gap-4 min-w-0'>
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.nickname}
                         className='w-8 h-8 object-cover rounded-full shrink-0'/>
                  ) : (
                    <div
                      className='w-8 h-8 bg-surface rounded-full shrink-0 flex items-center justify-center text-label font-bold text-text-label'>
                      {player.nickname?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <h2 className='text-h2 truncate max-w-[90px]'>{player.nickname}</h2>
                </div>

                <AnimatePresence>
                  {hoveredPlayerId === player.user_id && isHost && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      type='button'
                      onClick={() => kickPlayer({ roomCode, teamId: team.team_id, playerId: player.user_id })}
                      className='w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0'
                    >
                      <img src={cross} alt="Remove Player" className='scale-80 transition-transform'/>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {isUserInTeam ? (
          <Button
            className='w-[184px] shadow-none text-text border border-transparent hover:brightness-95 transition-all'
            style={{ backgroundColor: TEAM_BG_MAP_DARK[team.color] }}
            onClick={handleLeave}
            disabled={isLeaving}
          >
            {isLeaving ? <Spinner size='sm' color='border-text'/> : "Leave the team"}
          </Button>
        ) : (
          <Button
            variant='tertiary'
            className='w-[184px]'
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? <Spinner size='sm' color='border-text'/> : "Join the team"}
          </Button>
        )}
      </div>
    </motion.li>
  );
};

export default TeamCard;
