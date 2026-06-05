import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJoinRoomMutation } from "@/api/lobby.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import GuestJoinModal from "@/components/modals/GuestJoinModal.jsx";

const JoinRoom = () => {
  const { code: roomCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showNotification } = useNotification();
  const { setRoom } = useLobby();

  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  const { mutate: joinRoom, isPending } = useJoinRoomMutation({
    onSuccess: () => {
      setRoom(roomCode);
      navigate(`/lobby/${roomCode}/waiting`, { replace: true });
    },
    onError: (error) => {
      showNotification({
        title: "Login error",
        message: error.response?.data?.detail || "Failed to join the room",
        isSuccess: false,
      });
      navigate("/");
    },
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !user) {
      setIsGuestModalOpen(true);
      return;
    }

    joinRoom({
      room_code: roomCode,
      nickname: user.nickname,
      avatar_url: user.avatar_url || "",
      guest_id: user.id
    });

  }, [isAuthLoading, isAuthenticated, user, roomCode, joinRoom]);

  return (
    <>
      <div className="flex flex-col w-full h-screen justify-center items-center gap-4">
        <Spinner size="lg" />
        <p className="text-h2 font-noto">Connecting to lobby...</p>
      </div>

      <GuestJoinModal
        isOpen={isGuestModalOpen}
        onClose={() => navigate("/")}
        roomCode={roomCode}
      />
    </>
  );
};

export default JoinRoom;
