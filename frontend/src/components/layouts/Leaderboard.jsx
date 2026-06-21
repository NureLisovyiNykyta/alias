import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import plus from '@/assets/plus.svg';
import minus from '@/assets/minus.svg';

export default function Leaderboard({
                                      types = null,
                                      label = 'Leaderboard',
                                      activeType = null,
                                      onChangeType = null,
                                      isHost = false
                                    }) {
  const actionItems = [
    { id: 1, type: 'button', icon: minus, alt: 'Decrease', size: 'size-5'},
    { id: 2, type: 'div', },
    { id: 3, type: 'button', icon: plus, alt: 'Increase', size: 'size-3' },
  ];

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
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className={`w-full rounded-[12px] border 
            ${i === 0 ? 'border-brand-300' : 'border-surface'}
            flex items-center justify-between px-2 py-4 ${types && 'shadow-buttons'}`}>
            <div className='flex items-center gap-4'>
              <div className='size-6 rounded-full bg-team-green-dark'/>
              <span className='text-label font-noto'>Midnight Team</span>
            </div>

            {!isHost ? (
              <span className={`text-label font-noto
                ${i === 0 && 'text-brand-500'}`}>{5 - i} points
              </span>
            ) : (
              <div className='flex items-center gap-1.5'>
                {actionItems.map(item => {
                  const Tag = item.type;
                  return (
                    <Tag key={item.id} className={`w-[30px] h-[26px] flex items-center justify-center ${item.type === 'button' ? 'bg-brand-500' : 'bg-surface border-[0.5px] border-text-label'} rounded-[7px]`}>
                      {item.type === 'button' ?
                        <img className={item.size} src={item.icon} alt={item.alt}/> : 5}
                    </Tag>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
