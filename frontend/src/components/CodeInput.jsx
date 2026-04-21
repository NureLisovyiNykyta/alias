import rightArrow from '@/assets/rightArrow.svg';
import { Button } from "@/components/Button.jsx";

const CodeInput = () => {
  return (
    <div className="w-full flex flex-col gap-8 rounded-[12px] p-8 bg-brand-300">
      <h1 className="text-title w-full">Let’s play!</h1>

      <div className="flex items-center gap-16">
        <div className="flex flex-col gap-2 min-w-[280px]">
          <p className="font-noto text-p">Type the existing game code below</p>

          <div
            className="flex bg-surface items-center border border-text-label rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px]">
            <input
              type="text"
              placeholder="524106"
              className="bg-transparent w-full outline-none text-label font-noto text-text-label"
            />

            <button
              className="flex items-center justify-center w-8 h-6 rounded-[8px] bg-brand-500"
            >
              <img src={rightArrow} alt=""/>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-[267px]">
          <h2 className="text-h2">Would you like to register?</h2>
          <Button
            className="w-full"
          >
            <span>Sign up</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CodeInput;
