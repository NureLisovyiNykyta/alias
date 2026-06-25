import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import plus from '@/assets/plus.svg';
import minus from '@/assets/minus.svg';
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { TEAM_BG_MAP_DARK } from "@/constants/teamColors.js";
import { motion, AnimatePresence } from "framer-motion";
import navigationArrow from '@/assets/navigationArrow.svg';
import { useState } from "react";

export default function Leaderboard({
                                      types = null,
                                      activeType = null,
                                      onChangeType = null,
                                      isHost = false,
                                      label = 'Leaderboard',
                                    }) {
  const { roomData, sendMessage } = useLobby();
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const teamsLeaderboard = Object.values(roomData?.teams || {}).sort(
    (a, b) => b.current_position - a.current_position
  );

  const teamsQueue = Object.values(roomData?.teams || {});
  const currentTurnTeamId = roomData?.current_turn?.team_id;

  const toggleAccordion = (id) => {
    setExpandedTeamId(prev => prev === id ? null : id);
  };

  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30
  };

  return (
    <div className={`bg-white rounded-[12px] p-4 gap-4 ${types && 'border border-surface'} w-full flex flex-col pt-0`}>
      {types ? (
        <NeutralSwitch
          options={types}
          activeId={activeType}
          onChange={onChangeType}
          layoutId="boardSwitchIndicator"
        />
      ) : (
        <div className='-mx-4 flex items-center p-4 pb-0 shrink-0'>
          <h2 className='text-h2'>{label}</h2>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeType === 'queue' ? (
          <motion.ul
            key="queue-list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`w-full flex flex-col ${types ? 'gap-1' : 'gap-4'}`}
          >
            {teamsQueue.map((team) => {
              const explainerId = team.player_ids[team.explainer_index];
              const explainer = roomData?.players?.[explainerId];
              const isPlayingNow = team.team_id === currentTurnTeamId;
              const isExpanded = expandedTeamId === team.team_id;

              return (
                <motion.li
                  layout
                  transition={springTransition}
                  key={team.team_id}
                  className={`w-full rounded-[12px] border flex flex-col overflow-hidden bg-white
                    ${isPlayingNow ? 'border-brand-300 shadow-buttons relative z-10' : 'border-surface z-0'}`}
                >
                  <button
                    onClick={() => toggleAccordion(team.team_id)}
                    className="w-full h-[56px] flex flex-col justify-center px-3 gap-1 outline-none cursor-pointer hover:bg-surface-light/30 transition-colors"
                  >
                    <div className='flex items-center justify-between w-full'>
                      <div className='flex items-center gap-3'>
                        <div
                          className='size-4 rounded-full shrink-0'
                          style={{ backgroundColor: TEAM_BG_MAP_DARK[team.color] }}
                        />
                        <span className='text-label font-noto font-bold'>{team.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPlayingNow && (
                          <span className="text-[10px] uppercase font-bold text-brand-500 tracking-wider">
                            Playing now
                          </span>
                        )}
                        <motion.img
                          src={navigationArrow}
                          alt="Toggle"
                          className="size-4 opacity-40"
                          animate={{ rotate: isExpanded ? 270 : 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-7 w-full">
                      <span className="text-[12px] font-noto text-text-label">Explainer:</span>
                      <div className="flex items-center gap-1.5 bg-surface-light px-2 py-0.5 rounded-md">
                        {explainer?.avatar_url ? (
                          <img src={explainer.avatar_url} alt="avatar" className="size-4 rounded-full object-cover" />
                        ) : (
                          <div className="size-4 rounded-full bg-surface" />
                        )}
                        <span className="text-[12px] font-noto text-text-primary">
                          {explainer?.nickname || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className="px-3 pb-3 pt-2 border-t border-surface flex flex-col gap-2 bg-surface-light/10">
                          <span className="text-[12px] font-noto text-text-label pl-7">Team roster:</span>
                          <ul className="flex flex-col gap-1.5 pl-7">
                            {team.player_ids.map(playerId => {
                              const player = roomData?.players?.[playerId];
                              const isPlayerExplainer = playerId === explainerId;

                              return (
                                <li key={playerId} className="flex items-center gap-1.5">
                                  {player?.avatar_url ? (
                                    <img src={player.avatar_url} alt="avatar" className="size-4 rounded-full object-cover" />
                                  ) : (
                                    <div className="size-4 rounded-full bg-surface shrink-0" />
                                  )}
                                  <span className="text-[12px] font-noto text-text-primary">
                                    {player?.nickname || 'Unknown'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : (
          <motion.ul
            key="leaderboard-list"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`w-full flex flex-col ${types ? 'gap-1' : 'gap-4'}`}
          >
            {teamsLeaderboard.map((team, i) => (
              <motion.li
                layout
                transition={springTransition}
                key={team.team_id}
                className={`w-full h-[58px] rounded-[12px] border font-bold bg-white
                ${i === 0 ? 'border-brand-300 relative z-10' : 'border-surface z-0'}
                flex items-center justify-between px-3 ${types && 'shadow-buttons'}`}
              >
                <div className='flex items-center gap-4'>
                  <div
                    className='size-6 rounded-full'
                    style={{ backgroundColor: TEAM_BG_MAP_DARK[team.color] || 'var(--color-surface)' }}
                  />
                  <span className='text-label font-noto'>{team.name}</span>
                </div>

                {!isHost ? (
                  <span className={`text-label font-noto ${i === 0 && 'text-brand-500'}`}>
                  {team.current_position} points
                </span>
                ) : (
                  <div className='flex items-center gap-1.5'>
                    <button
                      type="button"
                      onClick={() => sendMessage({ type: 'adjust_score', payload: { team_id: team.team_id, delta: -1 } })}
                      className="w-[30px] h-[26px] flex items-center justify-center bg-surface border-[0.5px] border-text-label rounded-[7px] cursor-pointer hover:opacity-80 transition-opacity outline-none"
                    >
                      <img src={minus} alt="Decrease" className="size-5" />
                    </button>

                    <div className="w-[30px] h-[26px] flex items-center justify-center bg-surface border-[0.5px] border-text-label rounded-[7px] font-noto text-label">
                      {team.current_position}
                    </div>

                    <button
                      type="button"
                      onClick={() => sendMessage({ type: 'adjust_score', payload: { team_id: team.team_id, delta: 1 } })}
                      className="w-[30px] h-[26px] flex items-center justify-center bg-brand-500 rounded-[7px] cursor-pointer hover:opacity-80 transition-opacity outline-none"
                    >
                      <img src={plus} alt="Increase" className="size-3" />
                    </button>
                  </div>
                )}
              </motion.li>
            ))}

            {teamsLeaderboard.length === 0 && (
              <p className="text-center text-text-secondary font-noto text-label py-4">No teams yet</p>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
