import CodeInput from "@/components/inputs/CodeInput.jsx";
import DiscordLink from "@/components/cards/DiscordLink.jsx";
import InfoCards from "@/components/cards/InfoCards.jsx";

const Landing = () => {
  return (
    <main className='min-h-screen w-full flex flex-col gap-16'>
      <CodeInput/>
      <InfoCards/>
      <DiscordLink/>
    </main>
  );
};

export default Landing;
