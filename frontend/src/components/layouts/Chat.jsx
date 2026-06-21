import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import Input from "@/components/inputs/Input.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";

export default function Chat({ types = null, activeType = null, onChangeType = null}) {
  const { user } = useAuth();

  return (
    <div className={`w-full h-full min-h-0 bg-white rounded-[12px] flex p-3 flex-col pt-0
    ${types && 'border border-surface'}`}>
      {types ? <NeutralSwitch options={types} onChange={onChangeType} activeId={activeType} layoutId="chatSwitchIndicator"/> :
        <div className='-mx-3 flex items-center border-b border-surface p-4 shrink-0'>
          <h2 className='text-h2'>Lobby chat</h2>
        </div>}

      <ul className='w-full h-full flex flex-col gap-4 py-3 px-1 overflow-y-auto'>
        {Array.from({ length: 20 }).map((_, i) => {
          const isMyMsg = i % 5 === 0;
          let message = <div className={`flex rounded-t-[12px] py-[10px] px-4 w-fit ${isMyMsg ? 'bg-brand-300 rounded-bl-[12px]' : 'bg-surface rounded-br-[12px]'}`}>
            <p className='font-noto wrap-break-word'>{i % 2 === 0 ? 'Hey pal! I’m looking f' : 'LOL'}</p>
          </div>;

          return (
            <li key={i} className={`w-full flex gap-4 relative ${isMyMsg && 'justify-end'}`}>
              <img
                src={user?.avatar_url}
                alt={`User ${user?.nickname} Picture`}
                className={`size-8 rounded-full shrink-0 sticky top-4 self-start ${isMyMsg && 'invisible'}`}
              />

              {!isMyMsg ? (
                <div className='flex flex-col w-full gap-1 min-w-0'>
                  <span className='text-label font-noto text-text-label truncate'>{user?.nickname}</span>
                  {message}
                </div>
              ) : message}
            </li>
          );
        })}
      </ul>

      <Input placeholder='Type your message' wide={true}/>
    </div>
  );
}
