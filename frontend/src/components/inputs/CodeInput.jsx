import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import Input from "@/components/inputs/Input.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useJoinRoomMutation } from "@/api/lobby.js";
import Spinner from "@/components/layouts/Spinner.jsx";

const CodeInput = () => {
  const { user, isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const { mutate: joinRoom, isPending } = useJoinRoomMutation({
    onSuccess: () => {
      navigate(`/lobby/${roomCode}/waiting`);
    },
    onError: (error) => {
      showNotification({
        title: "Error joining room",
        message: error.response?.data?.detail || "Could not join the lobby. Check the code.",
        isSuccess: false,
      });
    }
  });

  const handleSubmit = () => {
    if (!roomCode.trim()) return;

    if (!isAuthenticated || !user) {
      showNotification({
        title: "Auth required",
        message: "Please sign in to join a game.",
        isSuccess: false,
      });
      navigate('/auth/sign-in');
      return;
    }

    joinRoom({
      room_code: roomCode.trim(),
      nickname: user.nickname || user.username || "Player",
      avatar_url: user.avatar_url || "",
      guest_id: null
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 rounded-[12px] p-8 bg-brand-300 relative">
      <h1 className="text-title w-full">Let’s play!</h1>

      {isPending && (
        <div className="absolute inset-0 bg-brand-300/50 flex items-center justify-center rounded-[12px] z-10 backdrop-blur-sm">
          <Spinner size="lg" />
        </div>
      )}

      <div className="flex items-center gap-16">
        <Input
          id='code-input'
          label='Type the existing game code below'
          type="text"
          placeholder='524106'
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          onKeyDown={handleKeyDown}
          onArrowClick={handleSubmit}
          disabled={isPending}
        />

        {user && (
          <div className="flex flex-col gap-2 w-[267px]">
            <h2 className="text-h2">Would you like to make it up?</h2>
            <Button
              as={Link}
              to="/new/lobby"
              className="w-full"
              disabled={isPending}
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
