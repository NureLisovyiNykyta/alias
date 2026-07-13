import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/inputs/Input.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import ImageCropperModal from "@/components/modals/ImageCropperModal.jsx";
import plusIcon from '@/assets/grayPlus.svg';
import { useUploadAvatarMutation, useUpdateMeMutation } from "@/api/user.js";

const profileSchema = z.object({
  nickname: z.string().min(2, "Nickname must be at least 2 characters").optional().or(z.literal('')),
});

const AvatarStep = ({ onSuccess, onBack }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedFile, setCroppedFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { mutateAsync: uploadAvatar, isPending: isUploading } = useUploadAvatarMutation();
  const { mutateAsync: updateMe, isPending: isUpdating } = useUpdateMeMutation();

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: '' },
    mode: "onChange"
  });

  const currentNickname = useWatch({ control, name: "nickname" });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImageSrc(reader.result);
        setIsCropperOpen(true);
      };
      e.target.value = null;
    }
  };

  const handleCropSave = (file) => {
    setCroppedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setIsCropperOpen(false);
    setImageSrc(null);
  };

  const isBusy = isUploading || isUpdating;
  const hasData = !!croppedFile || (currentNickname && currentNickname.trim().length >= 2);

  const onSubmit = async (data) => {
    try {
      if (croppedFile) {
        await uploadAvatar(croppedFile);
      }
      if (data.nickname && data.nickname.trim().length >= 2) {
        await updateMe({ nickname: data.nickname.trim() });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to update profile", error);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-5 items-center">
      <div className="w-full border border-text-label rounded-[8px] py-10 px-21 flex flex-col gap-6 bg-white items-center">
        <span className="font-noto text-p">Add your avatar</span>

        <label className="cursor-pointer w-[120px] h-[120px] rounded-full bg-surface flex items-center justify-center overflow-hidden border border-text-label/20 hover:bg-surface/80 transition-colors">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <img src={plusIcon} alt="Add" className="w-8 h-8 opacity-50" />
          )}
          <input type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleFileSelect} />
        </label>
        <span className="text-label text-text-label font-noto">Choose an image in the correct format</span>

        <div className="w-full mt-4">
          <Input
            id="nickname"
            label="Nickname"
            placeholder="Enter your nickname"
            {...register("nickname")}
            error={!!errors.nickname}
            helpText={errors.nickname ? errors.nickname.message : "Enter a valid nickname"}
            showArrow={false}
            wide={true}
          />
        </div>
      </div>

      <div className="w-full flex justify-between">
        <Button type="button" onClick={onBack} variant="tertiary" disabled={isBusy}>
          Previous step
        </Button>
        <Button type="submit" disabled={isBusy || !!errors.nickname}>
          {isBusy ? <Spinner size="sm"/> : (hasData ? "Finish" : "Skip")}
        </Button>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false);
          setImageSrc(null);
        }}
        imageSrc={imageSrc}
        onSave={handleCropSave}
        aspect={1}
      />
    </form>
  );
};

export default AvatarStep;
