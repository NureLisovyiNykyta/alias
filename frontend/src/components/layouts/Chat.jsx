import { useMemo } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import Input from "@/components/inputs/Input.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";

export default function Chat({ types = null, activeType = null, onChangeType = null }) {
  const { user } = useAuth();

  const groupedMessages = useMemo(() => {
    const rawMessages = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      text: i % 2 === 0 ? 'Hey pal! I’m looking f' : 'LOL',
      isMyMsg: i % 5 === 0,
      senderName: i % 5 === 0 ? user?.nickname : 'SunShine',
      avatar: user?.avatar_url
    }));

    const groups = [];

    rawMessages.forEach((msg) => {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.isMyMsg === msg.isMyMsg && lastGroup.senderName === msg.senderName) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          isMyMsg: msg.isMyMsg,
          senderName: msg.senderName,
          avatar: msg.avatar,
          messages: [msg]
        });
      }
    });

    return groups;
  }, [user]);

  return (
    <div className='w-full h-full min-h-0 bg-white rounded-[12px] flex p-3 flex-col pt-0 border border-surface'>
      {types ? (
        <NeutralSwitch options={types} onChange={onChangeType} activeId={activeType} layoutId="chatSwitchIndicator" />
      ) : (
        <div className='-mx-3 flex items-center border-b border-surface p-4 shrink-0'>
          <h2 className='text-h2'>Lobby chat</h2>
        </div>
      )}

      <ul className='w-full h-full flex flex-col gap-5 py-3 px-1 overflow-y-auto'>
        {groupedMessages.map((group, groupIdx) => (
          <li key={groupIdx} className={`w-full flex gap-4 ${group.isMyMsg ? 'justify-end' : ''}`}>

            {!group.isMyMsg && (
              <div className="shrink-0 flex flex-col relative">
                <img
                  src={group.avatar}
                  alt={`User ${group.senderName} Picture`}
                  className="size-8 rounded-full sticky top-0"
                />
              </div>
            )}

            <div className={`flex flex-col min-w-0 ${group.isMyMsg ? 'items-end' : 'items-start w-full'}`}>

              {!group.isMyMsg && (
                <span className='text-label font-noto text-text-label truncate mb-1'>
                  {group.senderName}
                </span>
              )}

              <div className={`flex flex-col w-full gap-1 ${group.isMyMsg ? 'items-end' : 'items-start'}`}>
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex rounded-t-[12px] py-[10px] px-4 w-fit ${
                      group.isMyMsg ? 'bg-brand-300 rounded-bl-[12px]' : 'bg-surface rounded-br-[12px]'
                    }`}
                  >
                    <p className='font-noto wrap-break-word'>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </li>
        ))}
      </ul>

      <Input placeholder='Type your message' wide={true} />
    </div>
  );
}
