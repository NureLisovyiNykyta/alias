import lookingForParty from '@/assets/looking-for-party.png';
import discord from '@/assets/discord.svg';
import copy from '@/assets/copy.svg';
import { Button } from "@/components/Button.jsx";

const DiscordLink = () => {
  return (
    <div className='flex flex-col w-full bg-surface rounded-[12px] p-8 gap-8'>
      <div className='flex flex-col w-full gap-4'>
        <div className='flex items-center gap-4 w-full '>
          <img className='object-cover w-25 h-20' src={lookingForParty} alt=""/>
          <h1 className='text-h1'>Looking for party?</h1>
        </div>

        <p className='text-p font-noto'>Join our Discord to meet 150+ players from all abroad to play Alias and test your quick-thinking skills! Whether you are trying to frantically describe your favorite characters or just dropping in for a casual game night, we have a lobby waiting for you.</p>
      </div>

      <div className='flex items-center gap-8'>
        <Button>
          <div className="flex items-center gap-2 w-full">
            <img src={discord} alt=""/>
            <span className='text-nowrap'>Join the Discord</span>
          </div>
        </Button>

        <button
          className='flex items-center gap-2 text-brand-500'
        >
          <img src={copy} alt=""/>
          <span className='text-label font-noto'>Copy the link</span>
        </button>
      </div>
    </div>
  );
};

export default DiscordLink;
