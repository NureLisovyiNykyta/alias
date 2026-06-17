import React, { useEffect, useState } from 'react';
import { useMapThemesQuery } from '@/api/maps';
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";
import TeamsDashboard from "@/components/layouts/TeamsDashboard.jsx";
import PhaseAndTimer from "@/components/layouts/PhaseAndTimer.jsx";
import ChatAndLeaderboard from "@/components/layouts/ChatAndLeaderboard.jsx";
import TurnAlert from "@/components/layouts/TurnAlert.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import GuessModal from "@/components/modals/GuessModal.jsx";

const TEAM_COLORS = ['cyan', 'pink', 'yellow', 'purple'];

export default function Gameplay() {
  const { data: themes, isLoading, isError } = useMapThemesQuery();
  const { showNotification } = useNotification();

  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [quality, setQuality] = useState('scene_url_large');
  const [anchors, setAnchors] = useState({});

  const [activeTeams, setActiveTeams] = useState([
    { id: 'team-1', colorName: TEAM_COLORS[0], spotIndex: 0, step: 0 }
  ]);

  useEffect(() => {
    showNotification({
      type: 'game',
      title: 'Explainer is preparing...',
      isSuccess: null,
      message: 'The game will start soon',
    });
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-slate-950 text-slate-400">
        <span className="text-sm font-medium animate-pulse">Loading themes...</span>
      </div>
    );
  }

  if (isError || !themes || themes.length === 0) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-slate-950 text-red-400">
        <span className="text-sm font-medium">Failed to load map themes.</span>
      </div>
    );
  }

  const activeTheme = themes[selectedThemeIndex];

  const colorMap = {
    red: '#ef4444', blue: '#3b82f6', cyan: '#06b6d4', pink: '#ec4899',
    brown: '#78350f', green: '#22c55e', purple: '#a855f7', yellow: '#eab308',
  };

  const addTeam = () => {
    if (activeTeams.length >= 4) return;

    const newTeamIndex = activeTeams.length;
    setActiveTeams((prev) => [
      ...prev,
      {
        id: `team-${newTeamIndex + 1}`,
        colorName: TEAM_COLORS[newTeamIndex],
        spotIndex: newTeamIndex,
        step: 0
      }
    ]);
  };

  const changeTeamStep = (id, amount) => {
    setActiveTeams((prev) =>
      prev.map((team) => {
        if (team.id === id) {
          const nextStep = Math.max(0, Math.min(63, team.step + amount));
          return { ...team, step: nextStep };
        }
        return team;
      })
    );
  };

  const piecesData = activeTeams.map((team) => {
    let targetPos = [0, 0, 0];

    const targetAnchorIndex = team.step * 4 + team.spotIndex;

    if (anchors && anchors[targetAnchorIndex]) {
      targetPos = anchors[targetAnchorIndex];
    } else if (anchors && anchors[team.step * 4]) {
      targetPos = anchors[team.step * 4];
    }

    return {
      id: team.id,
      textureUrl: activeTheme.color_textures[team.colorName],
      position: targetPos
    };
  });

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <div className="absolute top-4 left-4 z-10 w-full max-w-xs bg-slate-900/90 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-2xl text-slate-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white tracking-wide">Theme Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Live API Data</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Select Theme
          </label>
          <select
            value={selectedThemeIndex}
            onChange={(e) => {
              setSelectedThemeIndex(Number(e.target.value));
              setAnchors({});
              setActiveTeams([{ id: 'team-1', colorName: TEAM_COLORS[0], spotIndex: 0, step: 0 }]);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            {themes.map((theme, index) => (
              <option key={theme.id} value={index}>{theme.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Visual Quality
          </label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="scene_url_large">High (Large)</option>
            <option value="scene_url_medium">Medium (Balanced)</option>
            <option value="scene_url_small">Low (Optimized)</option>
          </select>
        </div>

        <hr className="border-slate-700 mb-6" />

        <div className="mb-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Active Teams ({activeTeams.length}/4)
          </label>

          <div className="flex flex-col gap-2 mb-4">
            {activeTeams.map((team, idx) => (
              <div key={team.id} className="flex items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: colorMap[team.colorName] || team.colorName }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-200 font-medium">Player {idx + 1}</span>
                    <span className="text-xs text-slate-400 font-mono">Square index: {team.step}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeTeamStep(team.id, -1)}
                    disabled={team.step === 0}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold w-7 h-7 rounded flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeTeamStep(team.id, 1)}
                    disabled={team.step >= 63}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold w-7 h-7 rounded flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addTeam}
            disabled={activeTeams.length >= 4}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            + Add New Player Piece
          </button>
        </div>
      </div>

      {activeTheme && activeTheme[quality] && (
        <ThemeCanvas
          mapUrl={activeTheme[quality]}
          pieceUrl={activeTheme.piece_model_url}
          pieces={piecesData}
          onAnchorsLoaded={setAnchors}
        />
      )}

      <TeamsDashboard/>
      <PhaseAndTimer/>
      <ChatAndLeaderboard/>
      {/*<TurnAlert/>*/}

      <GuessModal isOpen={true}/>
    </main>
  );
}
