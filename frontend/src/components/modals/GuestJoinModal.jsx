import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Input from "@/components/inputs/Input.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { useDefaultAvatarsQuery } from "@/api/user.js";
import { useJoinRoomMutation } from "@/api/lobby.js";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import crossIcon from "@/assets/cross.svg";

const guestSchema = z.object({
  nickname: z.string().min(2, "Nickname must be at least 2 characters"),
});

const GuestJoinModal = ({ isOpen, onClose, roomCode }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const navigate = useNavigate();
  const { setRoom } = useLobby();
  const { showNotification } = useNotification();

  const { data: avatars, isLoading: isAvatarsLoading } = useDefaultAvatarsQuery();

  useEffect(() => {
    if (avatars && avatars.length > 0 && !selectedAvatar) {
      setSelectedAvatar(avatars[0]);
    }
  }, [avatars, selectedAvatar]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(guestSchema),
    defaultValues: { nickname: '' },
    mode: "onChange"
  });

  const { mutate: joinRoom, isPending } = useJoinRoomMutation({
    onSuccess: (data) => {
      setRoom(data.room_code);
      navigate(`/lobby/${data.room_code}/waiting`, { replace: true });
    },
    onError: (error) => {
      showNotification({
        title: "Error joining room",
        message: error.response?.data?.detail || "Could not join the lobby.",
        isSuccess: false,
      });
    }
  });

  const onSubmit = (data) => {
    let guestId = localStorage.getItem("guest_id");
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem("guest_id", guestId);
    }

    joinRoom({
      room_code: roomCode.trim(),
      nickname: data.nickname.trim(),
      avatar_url: selectedAvatar || "",
      guest_id: guestId,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-text/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-[480px] bg-surface rounded-[16px] p-8 shadow-card-combined flex flex-col gap-6"
        >
          <button onClick={onClose} className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity">
            <img src={crossIcon} alt="Close" className="w-6 h-6" />
          </button>

          <div className="flex flex-col gap-2">
            <h2 className="text-h1">Join as Guest</h2>
            <p className="text-label text-text-label font-noto">Choose your nickname and avatar to play</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Input
              id="guest-nickname"
              label="Nickname"
              placeholder="Enter your nickname"
              {...register("nickname")}
              error={!!errors.nickname}
              helpText={errors.nickname ? errors.nickname.message : ""}
              showArrow={false}
              wide={true}
              disabled={isPending}
            />

            <div className="flex flex-col gap-3">
              <span className="font-noto text-p">Choose an avatar</span>
              {isAvatarsLoading ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {avatars?.map((url) => (
                    <button
                      key={url}
                      type="button"
                      disabled={isPending}
                      onClick={() => setSelectedAvatar(url)}
                      className={`w-[60px] h-[60px] rounded-full overflow-hidden border-2 transition-all ${
                        selectedAvatar === url ? "border-brand-500 scale-110 shadow-sm" : "border-transparent hover:scale-105 opacity-80"
                      }`}
                    >
                      <img src={url} alt="avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={isPending || !!errors.nickname} className="w-full mt-2">
              {isPending ? <Spinner size="sm" color="border-text" /> : "Join Game"}
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GuestJoinModal;
