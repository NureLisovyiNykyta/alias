import CodeInput from "@/components/CodeInput";
import DiscordLink from "@/components/DiscordLink.jsx";

const Landing = () => {
  return (
    <main className='min-h-screen w-full flex flex-col gap-16 p-5'>
      <CodeInput/>

      <DiscordLink/>
    </main>
  );
};

export default Landing;
