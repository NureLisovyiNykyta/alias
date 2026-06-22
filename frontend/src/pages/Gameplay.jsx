import React, { useEffect, useMemo, useState } from 'react';
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";
import TeamsDashboard from "@/components/layouts/TeamsDashboard.jsx";
import PhaseAndTimer from "@/components/layouts/PhaseAndTimer.jsx";
import ChatAndLeaderboard from "@/components/layouts/ChatAndLeaderboard.jsx";
import TurnAlert from "@/components/modals/TurnAlert.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import GuessModal from "@/components/modals/GuessModal.jsx";
import Results from "@/components/modals/Results.jsx";
import HostActions from "@/components/layouts/HostActions.jsx";
import Leaderboard from "@/components/layouts/Leaderboard.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";

export default function Gameplay() {
  const { code: roomCode } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const { roomData } = useLobby();
  const { user } = useAuth();

  const currentUserId = user?.id || localStorage.getItem('guest_id');

  const currentTurn = roomData?.current_turn;
  const isHost = roomData?.host_id === currentUserId;

  const isExplainer = currentTurn?.explainer_id === currentUserId;
  const currentPhase = currentTurn?.phase; // PREPARE, GUESSING, REVIEW

  const currentTeam = roomData?.teams?.[currentTurn?.team_id];
  const currentExplainer = roomData?.players?.[currentTurn?.explainer_id];

  const [modalIsOpen, setModalIsOpen] = useState(true);
  const [anchors, setAnchors] = useState({});

  // useEffect(() => {
  //   if (!roomData) {
  //     navigate(`/lobby/${roomCode}/waiting`);
  //   }
  // }, [roomData, navigate, roomCode]);

  const themeInfo = roomData?.theme_info;

  const piecesData = useMemo(() => {
    if (!roomData?.teams || !themeInfo || !anchors || Object.keys(anchors).length === 0) return [];

    return Object.values(roomData.teams).map((team, teamIndex) => {
      const squareIdx = team.current_position;

      const flatIndex = squareIdx * 4 + teamIndex;
      const pos = anchors[flatIndex] || [0, 0, 0];

      const colorKey = team.color ? team.color.toLowerCase() : 'cyan';
      const textureUrl = themeInfo.color_textures?.[colorKey] ||   themeInfo.color_textures?.cyan;

      return {
        id: team.team_id || team.id,
        textureUrl: textureUrl,
        position: pos,
      };
    });
  }, [roomData?.teams, themeInfo, anchors]);

  if (!roomData || !themeInfo) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-slate-950 text-slate-400 gap-2">
        <Spinner color='border-text-slate-400'/>
        <span className="text-sm font-medium animate-pulse">Loading themes</span>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <TeamsDashboard team={currentTeam} explainer={currentExplainer} />
      <PhaseAndTimer phase={currentPhase} endsAt={currentTurn?.ends_at} />

      <ChatAndLeaderboard />

      {/*{currentPhase === 'PREPARE' && (*/}
      {/*  <TurnAlert*/}
      {/*    isOpen={true}*/}
      {/*    isExplainer={isExplainer}*/}
      {/*    currentTurn={currentTurn}*/}
      {/*    teams={roomData.teams}*/}
      {/*    onStart={() => sendJsonMessage({ type: 'ready' })}*/}
      {/*  />*/}
      {/*)}*/}

      {/*{currentPhase === 'GUESSING' && (*/}
      {/*  <GuessModal*/}
      {/*    isOpen={true}*/}
      {/*    isExplainer={isExplainer}*/}
      {/*    currentTurn={currentTurn}*/}
      {/*    // Передаем функции для отправки свайпов на бекенд*/}
      {/*    onSwipeSwipeRight={() => sendJsonMessage({ type: 'card_swipe', payload: { status: 'GUESSED' } })}*/}
      {/*    onSwipeSwipeLeft={() => sendJsonMessage({ type: 'card_swipe', payload: { status: 'FAILED' } })}*/}
      {/*    onTimerExpired={() => sendJsonMessage({ type: 'timer_expired' })}*/}
      {/*  />*/}
      {/*)}*/}

      {/*{currentPhase === 'REVIEW' && (*/}
      {/*  <Results*/}
      {/*    isOpen={true}*/}
      {/*    isExplainer={isExplainer}*/}
      {/*    isHost={isHost}*/}
      {/*    roundCards={currentTurn?.round_cards || []}*/}
      {/*    onEditCardStatus={(cardId, newStatus) =>*/}
      {/*      sendJsonMessage({*/}
      {/*        type: 'edit_card_status',*/}
      {/*        payload: { card_id: cardId, new_status: newStatus }*/}
      {/*      })*/}
      {/*    }*/}
      {/*    onConfirm={() => sendJsonMessage({ type: 'confirm_results' })}*/}
      {/*  />*/}
      {/*)}*/}

      {isHost && <HostActions />}

      <ThemeCanvas
        mapUrl={themeInfo.scene_url}
        pieceUrl={themeInfo.piece_model_url}
        pieces={piecesData}
        onAnchorsLoaded={setAnchors}
      />
    </main>
  );
}
