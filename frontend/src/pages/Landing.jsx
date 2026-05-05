import CodeInput from "@/components/CodeInput";
import DiscordLink from "@/components/DiscordLink.jsx";
import InfoCards from "@/components/InfoCards.jsx";

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
