import { useMemo, useState, useRef, useEffect } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import rightArrow from '@/assets/rightArrow.svg';

export default function Chat({ types = null, activeType = null, onChangeType = null }) {
  const { user } = useAuth();
  const [generalMsgs, setGeneralMsgs] = useState([
    { id: 'g1', text: 'Hello everyone!', isMyMsg: false, senderName: 'Alice', avatar: null },
    { id: 'g2', text: 'Ready to play?', isMyMsg: false, senderName: 'Alice', avatar: null }
  ]);
  const [teamMsgs, setTeamMsgs] = useState([
    { id: 't1', text: 'Let us win this round!', isMyMsg: false, senderName: 'Bob', avatar: null }
  ]);

  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const isGeneral = activeType === 'general';
  const activeMessages = isGeneral ? generalMsgs : teamMsgs;
  const scrollRef = useRef(null);

  const groupedMessages = useMemo(() => {
    const groups = [];
    activeMessages.forEach((msg) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.isMyMsg === msg.isMyMsg && lastGroup.senderName === msg.senderName) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ id: `group-${msg.id}`, isMyMsg: msg.isMyMsg, senderName: msg.senderName, avatar: msg.avatar, messages: [msg] });
      }
    });
    return groups;
  }, [activeMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groupedMessages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMsg = { id: Date.now().toString(), text: inputValue, isMyMsg: true, senderName: user?.nickname || 'Me', avatar: user?.avatar_url };

    if (isGeneral) setGeneralMsgs(prev => [...prev, newMsg]);
    else setTeamMsgs(prev => [...prev, newMsg]);

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className='w-full h-full min-h-0 bg-white rounded-[12px] flex p-3 flex-col pt-0 border border-surface'>
      <div className="shrink-0">
        {types ? <NeutralSwitch options={types} activeId={activeType} onChange={onChangeType} layoutId="chatSwitchIndicator" /> :
          (<div className='-mx-4 flex items-center py-4 px-8 shrink-0'>
            <h2 className='text-h2'>Lobby Chat</h2>
          </div>)}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden flex flex-col bg-white my-2 scrollbar-always-visible">
        <AnimatePresence mode="wait">
          <motion.ul key={activeType} initial={{ opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full flex flex-col gap-4">
            {groupedMessages.map((group) => (
              <motion.li layout key={group.id} className={`w-full flex gap-4 ${group.isMyMsg ? 'justify-end' : ''}`}>
                {!group.isMyMsg && <img src={group.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + group.senderName} className="size-8 rounded-full sticky top-0" />}
                <div className={`flex flex-col min-w-0 ${group.isMyMsg ? 'items-end' : 'items-start w-full'}`}>
                  {!group.isMyMsg && <span className='text-label font-noto text-text-label mb-1'>{group.senderName}</span>}
                  <div className={`flex flex-col w-full gap-1 ${group.isMyMsg ? 'items-end' : 'items-start'}`}>
                    {group.messages.map((msg) => (
                      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={msg.id} className={`py-[10px] px-4 rounded-[12px] ${group.isMyMsg ? 'bg-brand-300 ml-12' : 'bg-surface'}`}>
                        <p className='font-noto text-[14px] break-words'>{msg.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>

      <div className="shrink-0 flex items-end gap-2 bg-surface p-2 rounded-[12px] border border-text-label">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full bg-transparent outline-none text-label font-noto resize-none h-[44px] p-2 overflow-y-auto"
        />
        <button onClick={handleSendMessage} className="p-2 bg-brand-500 rounded-[8px] self-center ">
          <img src={rightArrow} alt="Send" />
        </button>
      </div>
    </div>
  );
}
