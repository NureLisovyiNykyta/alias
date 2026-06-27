import { useMemo, useState, useRef, useEffect } from "react";
import NeutralSwitch from "@/components/buttons/NeutralSwitch.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import rightArrow from '@/assets/rightArrow.svg';

import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY);

export default function Chat({ types = null, activeType = null, onChangeType = null }) {
  const { user } = useAuth();
  const { chatMessages, sendMessage } = useLobby();

  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');

  const isGeneral = !types || activeType === 'general' || activeType === 'room';
  const rawMessages = isGeneral ? (chatMessages?.room || []) : (chatMessages?.team || []);

  const activeMessages = useMemo(() => {
    const currentUserId = user?.id || user?.user_id || localStorage.getItem("guest_id");

    return rawMessages.map(msg => ({
      id: msg.message_id,
      text: msg.content,
      mediaUrl: msg.media_url,
      isMyMsg: msg.sender_id === currentUserId,
      senderName: msg.sender_nickname,
      avatar: msg.sender_avatar_url
    }));
  }, [rawMessages, user]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    activeMessages.forEach((msg) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.isMyMsg === msg.isMyMsg && lastGroup.senderName === msg.senderName) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          id: `group-${msg.id}`,
          isMyMsg: msg.isMyMsg,
          senderName: msg.senderName,
          avatar: msg.avatar,
          messages: [msg]
        });
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

    const trimmed = inputValue.trim();

    const isGiphyLink = trimmed.startsWith('https://media.giphy.com/') ||
      trimmed.startsWith('https://i.giphy.com/');

    if (isGiphyLink) {
      sendMessage({
        type: 'chat_message',
        payload: {
          target: isGeneral ? 'room' : 'team',
          content: '',
          message_type: 'gif',
          media_url: trimmed
        }
      });
    } else {
      sendMessage({
        type: 'chat_message',
        payload: {
          target: isGeneral ? 'room' : 'team',
          content: trimmed,
          message_type: 'text'
        }
      });
    }

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
  };

  const handleSendGif = (gifUrl) => {
    sendMessage({
      type: 'chat_message',
      payload: {
        target: isGeneral ? 'room' : 'team',
        content: '',
        message_type: 'gif',
        media_url: gifUrl
      }
    });
    setShowGifPicker(false);
    setGifSearchQuery('');
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

  const fetchGifs = (offset) => {
    if (gifSearchQuery) {
      return gf.search(gifSearchQuery, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  return (
    <div className='w-full h-full min-h-0 bg-white rounded-[12px] flex p-3 flex-col pt-0 border border-surface relative'>
      <div className="shrink-0">
        {types ? (
          <NeutralSwitch options={types} activeId={activeType} onChange={onChangeType} layoutId="chatSwitchIndicator" />
        ) : (
          <div className='-mx-4 flex items-center py-4 px-8 shrink-0'>
            <h2 className='text-h2'>Lobby Chat</h2>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden flex flex-col bg-white my-2 scrollbar-always-visible">
        <AnimatePresence mode="wait">
          <motion.ul key={activeType} initial={{ opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full flex flex-col gap-4 py-2 pr-2">
            {groupedMessages.map((group) => (
              <motion.li layout key={group.id} className={`w-full flex gap-4 ${group.isMyMsg ? 'justify-end' : ''}`}>
                {!group.isMyMsg && <img src={group.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + group.senderName} className="size-8 rounded-full sticky top-0" alt="avatar" />}
                <div className={`flex flex-col min-w-0 ${group.isMyMsg ? 'items-end' : 'items-start w-full'}`}>
                  {!group.isMyMsg && <span className='text-label font-noto text-text-label mb-1'>{group.senderName}</span>}
                  <div className={`flex flex-col w-full gap-1 ${group.isMyMsg ? 'items-end' : 'items-start'}`}>
                    {group.messages.map((msg) => (
                      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={msg.id} className={` rounded-[12px] flex flex-col gap-2 ${group.isMyMsg ? 'bg-brand-300 ml-12' : 'bg-surface mr-12'} ${!msg.mediaUrl && 'py-[10px] px-4'}`}>
                        {msg.mediaUrl && (
                          <img src={msg.mediaUrl} alt="GIF" className="max-w-[140px] w-fit h-auto rounded-[8px]" />
                        )}
                        {msg.text && <p className='font-noto text-[14px] break-all'>{msg.text}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>

      {showGifPicker && (
        <div className="absolute bottom-[70px] left-3 bg-white border border-surface shadow-lg rounded-[12px] p-2 z-50 w-[280px]">
          <input
            type="text"
            placeholder="Search GIFs..."
            value={gifSearchQuery}
            onChange={(e) => setGifSearchQuery(e.target.value)}
            className="w-full bg-surface mb-2 p-2 rounded-[8px] outline-none text-label font-noto"
            autoFocus
          />
          <div className="h-[250px] overflow-y-auto overflow-x-hidden">
            <Grid
              key={gifSearchQuery}
              fetchGifs={fetchGifs}
              width={250}
              columns={2}
              gutter={6}
              onGifClick={(gif, e) => {
                e.preventDefault();
                handleSendGif(gif.images.fixed_height_downsampled.url);
              }}
            />
          </div>
        </div>
      )}

      <div className="shrink-0 flex items-end gap-2 bg-surface p-2 rounded-[12px] border border-text-label relative">
        <button
          onClick={() => setShowGifPicker(!showGifPicker)}
          className="p-2 flex items-center justify-center bg-white rounded-[8px] text-[12px] font-bold text-brand-500 self-center hover:bg-brand-100 transition-colors shrink-0"
        >
          GIF
        </button>

        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full bg-transparent outline-none text-label font-noto resize-none h-[44px] p-2 overflow-y-auto"
        />
        <button onClick={handleSendMessage} className="p-2 bg-brand-500 rounded-[8px] self-center shrink-0">
          <img src={rightArrow} alt="Send" />
        </button>
      </div>
    </div>
  );
}
