import { profileSchema, passwordSchema } from "@/schemas/profileSchema.js";
import profile from '@/assets/userProfile.svg';
import upload from '@/assets/upload.svg';
import emailIcon from '@/assets/darkMail.svg';
import gamepad from "@/assets/gamepad.svg";
import copy from "@/assets/darkCopy.svg";
import cross from "@/assets/redCross.svg";
import dropDownArrow from '@/assets/dropDownArrow.svg';
import Input from "@/components/inputs/Input.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { formatPackDate } from "@/utils/parseTime.js";
import { Disclosure, Transition } from '@headlessui/react';
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteMeMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation
} from "@/api/user.js";
import Spinner from "@/components/layouts/Spinner.jsx";
import ConfirmWindow from "@/components/modals/ConfirmWindow.jsx";
import { useState } from "react";
import ImageCropperModal from "@/components/modals/ImageCropperModal.jsx";
import { parseErrors } from "@/utils/parseErrors.js";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Accounts details", id: 2 },
];

const MyProfile = () => {
  const { user, logout, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const { mutate: updateMe, isPending: isUpdating } = useUpdateMeMutation();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePasswordMutation();
  const { mutate: deleteMe } = useDeleteMeMutation();

  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useUploadAvatarMutation();
  const { mutate: deleteAvatar, isPending: isDeletingAvatar } = useDeleteAvatarMutation();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors }
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: user?.nickname || '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, dirtyFields },
    control: passwordControl,
    reset: resetPassword
  } = useForm({
    resolver: zodResolver(passwordSchema),
    mode: "onChange"
  });

  const currentNewPassword = useWatch({ control: passwordControl, name: "newPassword" });
  const isNewPasswordValid = !!currentNewPassword && currentNewPassword.length > 0 && !passwordErrors.newPassword;

  const onProfileSubmit = (data) => {
    updateMe({
      nickname: data.nickname,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        showNotification({
          title: "Profile Updated",
          message: "Your display name has been successfully updated.",
          isSuccess: true
        });
      }
    });
  };

  const onPasswordSubmit = (data) => {
    changePassword({
      old_password: data.oldPassword,
      new_password: data.newPassword,
    }, {
      onSuccess: () => {
        resetPassword();
        showNotification({
          title: "Password Changed",
          message: "Your password has been successfully updated.",
          isSuccess: true
        });
      }
    });
  };

  const handleCopyLink = () => {
    if (user?.username) {
      const link = `${window.location.origin}/user/${user.username}`;
      navigator.clipboard.writeText(link)
        .then(() => {
          showNotification({
            title: "Link Copied",
            message: "Profile link copied to clipboard!",
            isSuccess: true
          });
        })
        .catch((err) => console.error("Failed to copy link: ", err));
    }
  };

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
    uploadAvatar(file, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        showNotification({
          title: "Avatar Updated",
          message: "Your profile picture has been successfully uploaded.",
          isSuccess: true
        });
        setIsCropperOpen(false);
        setImageSrc(null);
      },
      onError: (error) => {
        showNotification({
          title: "Error",
          message: `Failed to upload avatar. ${parseErrors(error.response?.data)}`,
          isSuccess: false
        });
      }
    });
  };

  const handleDeleteAvatar = (e) => {
    e.preventDefault();
    deleteAvatar(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        showNotification({
          title: "Avatar Removed",
          message: "Your profile picture has been permanently deleted.",
          isSuccess: true
        });
      }
    });
  };

  const confirmDeleteAccount = () => {
    deleteMe(undefined, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        logout();
      }
    });
  };

  const hasAvatar = !!user?.avatar_url;

  if (isLoading) {
    return (
      <main className="flex items-center justify-center w-full h-full gap-5">
        <Spinner size="lg" />
        <h2 className='text-h2 text-text-label'>Loading User Info</h2>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full gap-5 relative">
      <RowNavigation links={LINKS}/>

      <h1 className='text-h1'>Account details</h1>

      <div className='flex gap-8 w-full'>
        <div className='flex flex-col w-[250px] shrink-0 rounded-[16px] bg-surface overflow-hidden h-fit'>
          <div className='w-[250px] h-[250px] flex justify-center items-center shrink-0 bg-surface'>
            {isUploadingAvatar || isDeletingAvatar ? (
              <Spinner size='lg' />
            ) : (
              <img
                src={user?.avatar_url || profile}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className='flex flex-col w-full bg-surface border-t border-text-label/20'>
            <label
              className='flex items-center justify-center w-full gap-2 py-3 cursor-pointer hover:bg-surface/90 transition-colors'>
              <img src={upload} alt="Upload avatar"/>
              <span className='text-label font-noto'>Change profile picture</span>
              <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
              />
            </label>
            {hasAvatar && (
              <button
                onClick={handleDeleteAvatar}
                className='flex items-center justify-center w-full gap-2 py-3 hover:bg-surface/90 transition-colors text-text-warning border-t border-text-label/20'
              >
                <img src={cross} alt="Delete avatar" className="w-4 h-4"/>
                <span className='text-label font-noto'>Delete avatar</span>
              </button>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-6 w-full'>
          <ul className='flex items-center gap-8 flex-wrap'>
            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Playing Alias since</span>
              <p className='font-noto text-p'>{formatPackDate(user?.created_at)}</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Finished</span>
              <p className='font-noto text-p'>{user?.games_played || 0} games</p>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>E-mail</span>
              <div className='flex items-center gap-2'>
                <img src={emailIcon} alt="Email"/>
                <p className='font-noto text-p'>{user?.email}</p>
              </div>
            </li>

            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Username</span>
              <div className='flex items-center gap-2'>
                <img src={gamepad} alt="Username"/>
                <p className='font-noto text-p'>{user?.username}</p>
              </div>
            </li>
          </ul>

          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="flex items-center gap-4 ">
            <Input
              label='Display name'
              type='text'
              placeholder={user?.nickname}
              id='nickname'
              {...registerProfile("nickname")}
              error={!!profileErrors.nickname}
              helpText={profileErrors.nickname?.message}
              showArrow={false}
              width='w-[316px]'
            />
            <Button
              type="submit"
              variant="tertiary"
              className="self-end"
              disabled={isUpdating}
            >
              {isUpdating ? <Spinner size='sm'/> : 'Save'}
            </Button>
          </form>

          <div className="flex flex-col gap-2 max-w-[316px]">
            <span className="font-noto text-p">Password</span>
            <Disclosure>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    className="flex bg-surface items-center border border-text-label rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px] transition-colors hover:border-text-label/80">
                    <span className="text-label font-noto text-text-label outline-none">Change password</span>
                    <img
                      src={dropDownArrow}
                      alt="Toggle password change"
                      className={`${open ? 'rotate-180 transform' : ''} w-5 h-5`}
                    />
                  </Disclosure.Button>

                  <Transition
                    enter="transition duration-200 ease-out"
                    enterFrom="transform scale-95 opacity-0 -translate-y-2"
                    enterTo="transform scale-100 opacity-100 translate-y-0"
                    leave="transition duration-100 ease-in"
                    leaveFrom="transform scale-100 opacity-100 translate-y-0"
                    leaveTo="transform scale-95 opacity-0 -translate-y-2"
                  >
                    <Disclosure.Panel className="pt-2">
                      <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                            className="flex flex-col gap-4 border border-text-label/50 p-4 rounded-lg bg-surface/50">
                        <Input
                          label='Old Password'
                          type='password'
                          placeholder='********'
                          id='oldPassword'
                          showArrow={false}
                          {...registerPassword("oldPassword")}
                          error={!!passwordErrors.oldPassword}
                          helpText={passwordErrors.oldPassword?.message}
                        />

                        <Input
                          label='New Password'
                          type='password'
                          placeholder='********'
                          id='newPassword'
                          showArrow={false}
                          {...registerPassword("newPassword")}
                          error={!!passwordErrors.newPassword}
                          isValid={isNewPasswordValid}
                          helpText={passwordErrors.newPassword ? passwordErrors.newPassword.message : "Min 8 chars, 1 uppercase, 1 number"}
                          successText="Correct format"
                        />

                        <Button
                          type="submit"
                          disabled={isChangingPassword || !isNewPasswordValid || !dirtyFields.oldPassword}
                        >
                          {isChangingPassword ? <Spinner size='sm'/> : "Update Password"}
                        </Button>
                      </form>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          </div>

          <div className='flex gap-6 mt-4'>
            <Button
              variant='secondary'
              onClick={handleCopyLink}
            >
              <div className='flex items-center gap-2'>
                <img src={copy} alt="Copy"/>
                <span>Copy link to my profile</span>
              </div>
            </Button>

            <Button
              variant='tertiary'
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <div className='flex items-center gap-2'>
                <img src={cross} alt="Delete" className='scale-80'/>
                <span className='text-text-warning'>Delete my account permanently</span>
              </div>
            </Button>
          </div>
        </div>
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
        isUploading={isUploadingAvatar}
      />

      <ConfirmWindow
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={confirmDeleteAccount}
        title="Are you sure you want to delete your account? "
        label="This action cannot be undone and all your data will be permanently removed."
        paragraph='All your public card packs and maps will remain in the system with an anonymous author.'
      />
    </main>
  );
};

export default MyProfile;
