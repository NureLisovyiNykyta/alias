import React, { useState } from 'react';
import { useMapThemesQuery } from '@/api/maps';
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";

const generatePath = (startPos, stepSize, directions) => {
  let currentPos = [...startPos];
  const path = [[...currentPos]];

  directions.forEach(dir => {
    let nextPos = [...currentPos];
    switch (dir) {
      case 'R': nextPos[0] += stepSize; break;
      case 'L': nextPos[0] -= stepSize; break;
      case 'U': nextPos[2] -= stepSize; break;
      case 'D': nextPos[2] += stepSize; break;
      default: break;
    }
    path.push(nextPos);
    currentPos = [...nextPos];
  });

  return path;
};

const START_POS = [0.75, 0, 0.68];
const STEP_SIZE = 3.0;
const MAP_DIRECTIONS = [
  'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R',
  'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D',
  'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L',
  'U', 'U', 'U', 'U', 'U', 'U',
  'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R',
  'D', 'D', 'D', 'D',
  'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L',
  'U', 'U',
  'R', 'R', 'R', 'R', 'R',
];
const PATH_STEPS = generatePath(START_POS, STEP_SIZE, MAP_DIRECTIONS);

const SPOT_OFFSETS = [
  [-0.5, 0, -0.5],
  [ 0.5, 0, -0.5],
  [-0.5, 0,  0.5],
  [ 0.5, 0,  0.5],
];

const TEAM_COLORS = ['cyan', 'pink', 'yellow', 'purple'];

export default function ThemeViewerPage() {
  const { data: themes, isLoading, isError } = useMapThemesQuery();

  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [quality, setQuality] = useState('scene_url_large');

  const [activeTeams, setActiveTeams] = useState([
    { id: 'team-1', colorName: TEAM_COLORS[0], spotIndex: 0 }
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  const moveNext = () => {
    if (currentStep < PATH_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

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
        spotIndex: newTeamIndex
      }
    ]);
  };

  const piecesData = activeTeams.map((team) => {
    const offset = SPOT_OFFSETS[team.spotIndex];
    const basePos = PATH_STEPS[currentStep];
    return {
      id: team.id,
      textureUrl: activeTheme.color_textures[team.colorName],
      position: [
        basePos[0] + offset[0],
        basePos[1] + offset[1],
        basePos[2] + offset[2],
      ]
    };
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden">
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
            onChange={(e) => setSelectedThemeIndex(Number(e.target.value))}
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
              <div key={team.id} className="flex items-center gap-3 bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: colorMap[team.colorName] || team.colorName }}
                />
                <span className="text-sm text-slate-200 font-medium">Player {idx + 1}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addTeam}
              disabled={activeTeams.length >= 4}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              + Add
            </button>
            <button
              onClick={moveNext}
              disabled={currentStep >= PATH_STEPS.length - 1 || activeTeams.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Move Next
            </button>
          </div>
        </div>
      </div>

      {activeTheme && activeTheme[quality] && (
        <ThemeCanvas
          mapUrl={activeTheme[quality]}
          pieceUrl={activeTheme.piece_model_url}
          pieces={piecesData}
        />
      )}
    </div>
  );
}
