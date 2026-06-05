import React, { useState } from 'react';
import ThemeCanvas from "@/components/layouts/ThemeCanvas.jsx";

const STATIC_THEME = {
  name: "Beach (Local Static)",
  scene_url: "/scene_large.glb",
  piece_model_url: "/piece.glb",
  color_textures: {
    red: "/textures/red.png",
    blue: "/textures/blue.png",
    cyan: "/textures/cyan.png",
    pink: "/textures/pink.png",
    brown: "/textures/brown.png",
    green: "/textures/green.png",
    purple: "/textures/purple.png",
    yellow: "/textures/yellow.png"
  }
};

export default function ThemeViewerPage() {
  const [selectedColor, setSelectedColor] = useState('cyan');

  // Если в твоем constants.js структура отличается, этот объект подстрахует
  const fallbackColorMap = {
    red: '#ef4444',
    blue: '#3b82f6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    brown: '#78350f',
    green: '#22c55e',
    purple: '#a855f7',
    yellow: '#eab308'
  };

  // Объединяем дефолтные цвета с твоими из constants.js
  const activeColorMap = { ...fallbackColorMap };

  return (
    <div className="relative w-full h-[700px] flex flex-col">

      {/* UI Overlay Panel */}
      <div className="absolute top-4 left-4 z-10 w-full max-w-xs bg-slate-900/90 backdrop-blur-md p-5 rounded-xl border border-slate-800 shadow-2xl text-slate-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white tracking-wide">Theme Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Offline mode (Static Assets)</p>
        </div>

        {/* Active Theme Info */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            Current Theme
          </label>
          <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-medium">
            {STATIC_THEME.name}
          </div>
        </div>

        {/* Piece Color Picker */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Piece Color
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATIC_THEME.color_textures).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: activeColorMap[color] }}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none ring-2 ring-offset-2 ring-offset-slate-900 ${
                  selectedColor === color ? 'ring-indigo-500 scale-105' : 'ring-transparent'
                }`}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3D Scene viewport */}
      <div className="relative flex-1 w-full">
        <ThemeCanvas
          mapUrl={STATIC_THEME.scene_url}
          pieceUrl={STATIC_THEME.piece_model_url}
          colorTextureUrl={STATIC_THEME.color_textures[selectedColor]}
        />
      </div>
    </div>
  );
}