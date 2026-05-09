import { Button } from "@/components/buttons/Button.jsx";
import Input from "@/components/inputs/Input.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";

const CodeInput = () => {
  const { user } = useAuth();

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

        {user && (
          <div className="flex flex-col gap-2 w-[267px]">
            <h2 className="text-h2">Would you like to make it up?</h2>
            <Button
              as={Link}
              to="/new/lobby"
              className="w-full"
            >
              <span>Create new lobby</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeInput;
