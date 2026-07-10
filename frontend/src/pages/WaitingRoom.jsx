import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import copy from '@/assets/darkCopy.svg';
import plus from '@/assets/plus.svg';
import {
  useCloseRoomMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useLeaveRoomMutation,
  useStartGameMutation
} from "@/api/lobby.js";
import Spinner from "@/components/layouts/Spinner.jsx";
import { TEAM_COLORS, TEAM_BG_MAP } from "@/constants/teamColors.js";
import { parseUpperCase } from "@/utils/parseUpperCase.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo } from "react";
import TeamCard from "../components/cards/TeamCard.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import Chat from "@/components/layouts/Chat.jsx";
import { parseErrors } from "@/utils/parseErrors.js";
import OfflineOverlay from "@/components/layouts/OfflineOverlay.jsx";

const MIN_TEAMS = Number(import.meta.env.VITE_ROOM_MIN_TEAMS) || 2;
const MAX_TEAMS = Number(import.meta.env.VITE_ROOM_MAX_TEAMS) || 4;
const MIN_PLAYERS_PER_TEAM = Number(import.meta.env.VITE_ROOM_PLAYERS_PER_TEAM_MIN) || 1;
const MAX_PLAYERS_PER_TEAM = Number(import.meta.env.VITE_ROOM_PLAYERS_PER_TEAM_MAX) || 4;

const WaitingRoom = () => {
  const { code: roomCode } = useParams();

  const { setRoom, roomData, isRoomClosed, isConnected } = useLobby();
  const { user } = useAuth();

  const { showNotification, closeNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (roomData?.status === 'PLAYING') {
      showNotification({
        title: "Game is starting",
        message: "The host has started the game. You are being redirected to map page.",
        isSuccess: true,
      });

      navigate(`/lobby/${roomCode}/game`);
    }
  }, [roomData?.status, roomCode, navigate]);

  useEffect(() => {
    if (isRoomClosed) {
      setRoom(null);
      showNotification({
        title: "Lobby Closed",
        message: "The game lobby has been closed. This page will soon be closed.",
        isSuccess: true,
      });

      navigate('/');

      setTimeout(() => {
        closeNotification();
      }, 1500);
    }
  }, [isRoomClosed, navigate, showNotification, setRoom]);

  const { mutate: startGame, isPending: isStartingGame } = useStartGameMutation({
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to start the game. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  const { mutate: createTeam, isPending: isCreatingTeam } = useCreateTeamMutation();
  const { mutate: closeRoom, isPending: isClosingRoom } = useCloseRoomMutation({
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to close the lobby. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeamMutation({
    onSuccess: () => {
      showNotification({
        title: "Team Removed!",
        message: "Team has been successfully removed.",
        isSuccess: true,
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to delete the team. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  const isHost = roomData?.host_id === user?.id;
  const teamsList = roomData?.teams ? Object.values(roomData.teams) : [];

  const maxTeams = MAX_TEAMS;
  const canCreateTeam = teamsList.length < maxTeams && isHost;

  const nextTeamColor = useMemo(() => {
    const usedColors = teamsList.map(t => t.color);
    const availableColors = TEAM_COLORS.filter(color => !usedColors.includes(color));
    const pool = availableColors.length > 0 ? availableColors : TEAM_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [teamsList.length]);

  const handleCreateTeam = () => {
    createTeam({
      roomCode: roomCode,
      teamData: {
        name: `Team ${parseUpperCase(nextTeamColor)}`,
        color: nextTeamColor
      }
    });
  };

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
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to leave the lobby. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      showNotification({
        title: "Copied!",
        message: "The room code has been copied to the clipboard.",
        isSuccess: true,
      });
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  const handleCopyLink = async () => {
    const joinLink = `${window.location.origin}/lobby/${roomCode}/join`;

    try {
      await navigator.clipboard.writeText(joinLink);
      showNotification({
        title: "Copied!",
        message: "The lobby link has been copied to your clipboard.",
        isSuccess: true,
      });
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  const handleLeaveRoom = () => {
    const guestId = localStorage.getItem("guest_id");
    const playerId = user?.id || guestId;
    leaveRoom({ roomCode: roomCode, playerId: playerId });
  };

  const canStartGame = useMemo(() => {
    const teams = roomData?.teams ? Object.values(roomData.teams) : [];

    const minTeamsLimit = roomData?.settings?.min_teams || MIN_TEAMS;
    const minPlayersLimit = roomData?.settings?.players_per_team_min || MIN_PLAYERS_PER_TEAM;
    const maxPlayersLimit = roomData?.settings?.players_per_team_max || MAX_PLAYERS_PER_TEAM;

    if (teams.length < minTeamsLimit) return false;

    return teams.every(team => {
      const teamPlayersCount = team.player_ids?.length || 0;
      return teamPlayersCount >= minPlayersLimit && teamPlayersCount <= maxPlayersLimit;
    });
  }, [roomData]);

  if (!roomData) {
    return <div className="flex w-full h-full justify-center items-center"><Spinner/></div>;
  }

  return (
    <main className="grid grid-cols-[952px_1fr] w-full gap-16">
      <OfflineOverlay isConnected={isConnected} isInitialLoading={!roomData} />

      <div className='flex flex-col w-[952px] gap-16'>
        <div className="flex flex-col w-full gap-4">
          <h1 className="text-h1">Game <b>{roomData.name}</b> lobby — Waiting for players</h1>
          <span className="text-label text-text-label font-noto">
            Need at least <b>{MIN_TEAMS}</b> teams to start. Each team requires from <b>{MIN_PLAYERS_PER_TEAM}</b> to <b>{MAX_PLAYERS_PER_TEAM}</b> players.
          </span>
        </div>

        <div className='flex flex-col w-full gap-4'>
          <div className='flex items-center w-full justify-between gap-2'>
            <h2 className='text-h2'>
              {isHost ? 'Create and choose your team' :
                teamsList.length === 0 ? 'Waiting for host to add the teams...' : 'Choose your team'}
            </h2>
            <span className='text-label text-text-label font-noto'>
              {teamsList.length} / {maxTeams} teams
            </span>
          </div>

          <ul className='w-full flex items-center justify-start flex-wrap gap-5 overflow-hidden py-2'>
            <AnimatePresence>
              {teamsList.map((team) => (
                <TeamCard
                  key={team.team_id}
                  team={team}
                  roomCode={roomCode}
                  isHost={isHost}
                  onDeleteTeam={(id) => deleteTeam({ roomCode, teamId: id })}
                  isDeletingTeam={isDeletingTeam}
                  roomPlayers={roomData.players}
                  currentUser={user}
                />
              ))}
            </AnimatePresence>

            {canCreateTeam && (
              <li className={`flex items-center justify-center ${teamsList.length === 0 && 'w-[222px]'}`}>
                <Button
                  onClick={handleCreateTeam}
                  disabled={isCreatingTeam}
                  style={{ backgroundColor: TEAM_BG_MAP[nextTeamColor], color: 'var(--color-text)' }}
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

      <aside className='flex flex-col w-full gap-6 h-[calc(100vh-120px)]'>
        <div className='flex flex-col w-full gap-4'>
          <h2 className='text-h2'>Invite your friends</h2>

          <Button variant='tertiary' className='w-[189px]' onClick={handleCopyCode}>
            <img src={copy} alt="Copy"/>
            <span>{roomData.room_code}</span>
          </Button>

          <span className='text-label text-text-label font-noto'>
            Share the connection code with your friends
          </span>

          <Button variant='tertiary' className='w-[189px]' onClick={handleCopyLink}>
            <img src={copy} alt="Copy"/>
            <span>Copy the link</span>
          </Button>

          <span className='text-label text-text-label font-noto'>
            Or simply share the link to join the game
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <Chat/>
        </div>

        <div className='flex w-full gap-[10px] items-center justify-end'>
          {isHost ? (
            <>
              <Button
                onClick={() => closeRoom(roomCode)}
                disabled={isClosingRoom}
                variant='tertiary'
              >
                Stop the game
              </Button>

              <Button
                disabled={!canStartGame || isStartingGame}
                onClick={() => startGame(roomCode)}
              >
                Start the game
              </Button>
            </>
          ) : (
            <Button
              onClick={handleLeaveRoom}
              disabled={isLeavingRoom}
            >
              Leave the lobby
            </Button>
          )}
        </div>
      </aside>
    </main>
  );
};

export default WaitingRoom;
