import React from 'react';
import Spinner from "@/components/layouts/Spinner.jsx";

export default function OfflineOverlay ({ isConnected, isInitialLoading }) {
  if (isConnected || isInitialLoading) return null;

  return (
    <div className="fixed inset-0 z-150 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col items-center gap-4 p-8 bg-surface rounded-[12px] border border-slate-800 shadow-2xl animate-fade-in">
        <Spinner color='border-slate-400' />
        <h2 className="text-h2 text-slate-200">Connection Lost</h2>
        <p className="text-p font-noto text-slate-400 text-center max-w-xs">
          Waiting for network... Trying to reconnect to the server.
        </p>
      </div>
    </div>
  );
}
