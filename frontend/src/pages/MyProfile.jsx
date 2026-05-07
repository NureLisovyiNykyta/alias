import { useState } from 'react';
import profile from '@/assets/profile.png';
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteMeMutation
} from "@/api/user.js";
import Spinner from "@/components/layouts/Spinner.jsx";

const LINKS = [
  { path: "/", label: "Main Page", id: 1 },
  { label: "Accounts details", id: 2 },
];

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const profileSchema = z.object({
  nickname: z.string().min(2, "Display name must be at least 2 characters").optional().or(z.literal('')),
});

const MyProfile = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { mutate: updateMe, isPending: isUpdating } = useUpdateMeMutation();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePasswordMutation();
  const { mutate: deleteMe } = useDeleteMeMutation();

  const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm({
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

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      deleteMe();
    }
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const displayAvatar = avatarPreview || user?.avatar_url || profile;

  return (
    <main className="flex flex-col w-full gap-5">
      <RowNavigation links={LINKS}/>

      <h1 className='text-h1'>Account details</h1>

      <div className='flex gap-8 w-full'>
        <div
          style={{ backgroundImage: `url(${displayAvatar})` }}
          className='w-[310px] h-[310px] flex flex-col justify-end rounded-[16px] bg-cover bg-center shrink-0'
        >
          <label className='flex items-center justify-center w-full rounded-b-[12px] gap-2 py-2 bg-surface cursor-pointer hover:bg-surface/90 transition-colors'>
            <img src={upload} alt="Upload avatar"/>
            <span className='text-label font-noto'>Change profile picture</span>
            <input
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <div className='flex flex-col gap-6 w-full'>
          <ul className='flex items-center gap-8 flex-wrap'>
            <li className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Playing on Alias.com since</span>
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
                  <Disclosure.Button className="flex bg-surface items-center border border-text-label rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px] transition-colors hover:border-text-label/80">
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
                      <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="flex flex-col gap-4 border border-text-label/50 p-4 rounded-lg bg-surface/50">
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
              onClick={handleDeleteAccount}
            >
              <div className='flex items-center gap-2'>
                <img src={cross} alt="Delete"/>
                <span className='text-text-warning'>Delete my account permanently</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MyProfile;
