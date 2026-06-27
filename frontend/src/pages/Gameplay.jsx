import React, { useEffect, useMemo, useState } from 'react';
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";
import TeamsDashboard from "@/components/layouts/TeamsDashboard.jsx";
import PhaseAndTimer from "@/components/layouts/PhaseAndTimer.jsx";
import ChatAndLeaderboard from "@/components/layouts/ChatAndLeaderboard.jsx";
import TurnAlert from "@/components/modals/TurnAlert.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import GuessModal from "@/components/modals/GuessModal.jsx";
import Results from "@/components/modals/Results.jsx";
import GameActions from "@/components/layouts/GameActions.jsx";
import { useNavigate } from "react-router-dom";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import LeaderboardModal from "@/components/modals/LeaderboardModal.jsx";

export default function Gameplay() {
  const navigate = useNavigate();
  const { showNotification, closeNotification } = useNotification();

  const { roomData, sendMessage, setRoom, lastJsonMessage } = useLobby();
  const { user } = useAuth();

  const currentUserId = user?.id || localStorage.getItem('guest_id');

  const currentTurn = roomData?.current_turn;
  const isHost = roomData?.host_id === currentUserId;

  const isExplainer = currentTurn?.explainer_id === currentUserId;
  const currentPhase = currentTurn?.phase;

  const currentTeam = roomData?.teams?.[currentTurn?.team_id];
  const currentPosition = currentTeam?.current_position || 0;
  const currentField = roomData?.map_info?.fields?.[currentPosition];
  const currentExplainer = roomData?.players?.[currentTurn?.explainer_id];

  const timeLimit = currentField?.time_limit || 60;

  const explainerName = roomData?.players?.[currentTurn?.explainer_id]?.username || 'Explainer';

  const isGameFinished = roomData?.status === 'FINISHED';

  const [anchors, setAnchors] = useState({});

  useEffect(() => {
    if (currentPhase === 'PREPARE' && !isExplainer) {
      showNotification({
        title: "Explainer is preparing...",
        message: `The game will start soon`,
        type: 'game',
        isSuccess: null,
        autoClose: false
      });
    } else {
      closeNotification();
    }

    return () => closeNotification();
  }, [currentPhase, isExplainer, explainerName, showNotification, closeNotification]);

  useEffect(() => {
    if (!lastJsonMessage) return;

    const { type, payload } = lastJsonMessage;

    if (type === 'card_swiped' && !isExplainer) {
      showNotification({
        title: payload.content.text,
        message: null,
        type: 'game',
        isSuccess: payload.status === 'GUESSED',
        autoClose: true
      });
    }
  }, [lastJsonMessage, isExplainer, showNotification]);

  const themeInfo = roomData?.theme_info;

  const piecesData = useMemo(() => {
    if (!roomData?.teams || !themeInfo || !anchors || Object.keys(anchors).length === 0) return [];

    return Object.values(roomData.teams).map((team, teamIndex) => {
      const squareIdx = team.current_position;

      const flatIndex = squareIdx * 4 + teamIndex;
      const pos = anchors[flatIndex] || [0, 0, 0];

      const colorKey = team.color ? team.color.toLowerCase() : 'cyan';
      const textureUrl = themeInfo.color_textures?.[colorKey] || themeInfo.color_textures?.cyan;

      return {
        id: team.team_id || team.id,
        textureUrl: textureUrl,
        position: pos,
      };
    });
  }, [roomData?.teams, themeInfo, anchors]);

  const handleMainMenu = () => {
    setRoom(null);
    navigate('/');
  };

  if (!roomData || !themeInfo) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-slate-950 text-slate-400 gap-2">
        <Spinner color='border-text-slate-400'/>
        <span className="text-sm font-medium animate-pulse">Loading scene</span>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <TeamsDashboard team={currentTeam} explainer={currentExplainer} />
      <PhaseAndTimer
        phase={currentPhase}
        endsAt={currentTurn?.ends_at}
        timeLimit={timeLimit}
      />

      <ChatAndLeaderboard />

      {currentPhase === 'PREPARE' && isExplainer && (
        <TurnAlert
          onStart={() => sendMessage({ type: 'ready' })}
        />
      )}

      {currentPhase === 'GUESSING' && isExplainer && (
        <GuessModal
          isOpen={true}
          currentTurn={currentTurn}
          onSwipeRight={() => sendMessage({ type: 'card_swipe', payload: { status: 'GUESSED' } })}
          onSwipeLeft={() => sendMessage({ type: 'card_swipe', payload: { status: 'FAILED' } })}
        />
      )}

      {currentPhase === 'REVIEW' && (
        <Results
          isOpen={true}
          isEditable={isExplainer}
          award={currentField?.award || 1}
          penalty={currentField?.penalty || 1}
          roundCards={currentTurn?.round_cards || []}
          onEditCardStatus={(cardId, newStatus) =>
            sendMessage({
              type: 'edit_card_status',
              payload: { card_id: cardId, new_status: newStatus }
            })
          }
          onConfirm={() => sendMessage({ type: 'confirm_results' })}
          onOkay={() => {
          }}
        />
      )}

      <GameActions isHost={isHost}/>

      <ThemeCanvas
        mapUrl={themeInfo.scene_url}
        pieceUrl={themeInfo.piece_model_url}
        hdrUrl={themeInfo.background_url}
        pieces={piecesData}
        onAnchorsLoaded={setAnchors}
      />

      {isGameFinished && (
        <LeaderboardModal
          isHost={false}
          isOpen={true}
          onClose={handleMainMenu}
        />
      )}
    </main>
  );
}
