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

export default function Gameplay() {
  const { code: roomCode } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const { roomData } = useLobby();

  const [modalIsOpen, setModalIsOpen] = useState(true);
  const [anchors, setAnchors] = useState({});

  useEffect(() => {
    if (!roomData) {
      navigate(`/lobby/${roomCode}/waiting`);
    }
  }, [roomData, navigate, roomCode]);

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

  if (!roomData || !themeInfo) return <div>Загрузка игрового пространства...</div>;

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <PhaseAndTimer />
      <TeamsDashboard />
      <ChatAndLeaderboard />

      {/* <TurnAlert isOpen={modalIsOpen} onClose={() => setModalIsOpen(false)} /> */}
      {/* <GuessModal isOpen={modalIsOpen} onClose={() => setModalIsOpen(false)} /> */}
      {/* <Results isOpen={modalIsOpen} onClose={() => setModalIsOpen(false)} /> */}

      {roomData.host_id && <HostActions />}

      <ThemeCanvas
        mapUrl={themeInfo.scene_url}
        pieceUrl={themeInfo.piece_model_url}
        pieces={piecesData}
        onAnchorsLoaded={setAnchors}
      />
    </main>
  );
}
