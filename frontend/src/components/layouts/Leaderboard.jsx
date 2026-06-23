import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import plus from '@/assets/plus.svg';
import minus from '@/assets/minus.svg';
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { TEAM_BG_MAP_DARK } from "@/constants/teamColors.js";

export default function Leaderboard({
                                      types = null,
                                      activeType = null,
                                      onChangeType = null,
                                      isHost = false,
                                      label = 'Leaderboard',
                                    }) {
  const { roomData, sendMessage } = useLobby();

  const teams = Object.values(roomData?.teams || {}).sort((a, b) => b.current_position - a.current_position);

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

      <ul className={`w-full flex flex-col ${types ? 'gap-1' : 'gap-4'}`}>
        {teams.map((team, i) => (
          <li key={team.team_id} className={`w-full rounded-[12px] border 
            ${i === 0 ? 'border-brand-300' : 'border-surface'}
            flex items-center justify-between px-2 py-4 ${types && 'shadow-buttons'}`}>

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
          </li>
        ))}

        {teams.length === 0 && (
          <p className="text-center text-text-secondary font-noto text-label">No teams yet</p>
        )}
      </ul>
    </div>
  );
}
