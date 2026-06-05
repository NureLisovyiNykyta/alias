import React, { useState } from 'react';
import { useMapThemesQuery } from '@/api/maps';
import Spinner from "@/components/layouts/Spinner.jsx";
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";

export default function ThemeViewerPage() {
  const { data: themes, isLoading, isError } = useMapThemesQuery();

  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [quality, setQuality] = useState('scene_url_large');
  const [selectedColor, setSelectedColor] = useState('cyan');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 w-screen h-screen bg-slate-950 text-slate-400">
        <Spinner/>
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
            onChange={(e) => setSelectedThemeIndex(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            {themes.map((theme, index) => (
              <option key={theme.id} value={index}>{theme.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
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

        {activeTheme.color_textures && (
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Piece Color
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(activeTheme.color_textures).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: colorMap[color] || color }}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none ring-2 ring-offset-2 ring-offset-slate-900 ${
                    selectedColor === color ? 'ring-indigo-500 scale-105' : 'ring-transparent'
                  }`}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {activeTheme && activeTheme[quality] && (
        <ThemeCanvas
          mapUrl={activeTheme[quality]}
          pieceUrl={activeTheme.piece_model_url}
          colorTextureUrl={activeTheme.color_textures[selectedColor]}
        />
      )}
    </main>
  );
}
