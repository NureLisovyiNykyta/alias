import { Button } from "@/components/Button.jsx";
import Input from "@/components/Input.jsx";

const CodeInput = () => {
  return (
    <div className="w-full flex flex-col gap-8 rounded-[12px] p-8 bg-brand-300">
      <h1 className="text-title w-full">Let’s play!</h1>

      <div className="flex items-center gap-16">
        <Input
          id='code-input'
          label='Type the existing game code below'
          type="text"
          placeholder='524106'
        />

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
