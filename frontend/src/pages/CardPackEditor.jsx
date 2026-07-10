import React, { useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import cross from "@/assets/redCross.svg";
import TransparentInput from "@/components/inputs/TransparentInput.jsx";
import ImageInput from "@/components/inputs/ImageInput.jsx";
import StatusLabel from "@/components/cards/StatusLabel.jsx";
import TextArea from "@/components/inputs/TextArea.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import ImageCropperModal from "@/components/modals/ImageCropperModal.jsx";
import {
  usePackQuery,
  useUpdatePackMutation,
  useUploadPackCoverMutation,
  useDeletePackCoverMutation,
  useActivatePackMutation,
  usePublishPackMutation
} from "@/api/card-packs";
import { parseUpperCase } from "@/utils/parseUpperCase.js";
import { parseErrors } from "@/utils/parseErrors.js";
import { handleFileSelect } from "@/utils/fileHandlers.js";

const updatePackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().nullable(),
});

const CardPackEditor = () => {
  const { id: packId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification, closeNotification } = useNotification();

  const [imageSrc, setImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updatePackSchema),
    mode: "onChange",
    defaultValues: {
      name: '',
      image: null,
    }
  });

  const [currentName, currentImage] = useWatch({
    control,
    name: ["name", "image"],
  });

  const [description, setDescription] = useState('');

  const { data: packData, isLoading: isPackLoading } = usePackQuery(packId);

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: `${packData?.name} Pack`, path: `/card-pack/${packId}` },
    { id: 3, label: 'Edit Card Pack', path: null }
  ];

  useEffect(() => {
    if (packData) {
      reset({
        name: packData.name || '',
        image: packData.cover_url || packData.image_url || null,
      });
      setDescription(packData.description || '');
    }
  }, [packData, reset]);

  const { mutate: updatePack, isPending: isUpdating } = useUpdatePackMutation();
  const { mutate: uploadCover, isPending: isUploading } = useUploadPackCoverMutation();
  const { mutate: deleteCover, isPending: isDeleting } = useDeletePackCoverMutation();

  const handleCropSave = (file) => {
    uploadCover({ packId, file }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pack', packId] });
        setIsCropperOpen(false);
        setImageSrc(null);
        showNotification({
          title: "Cover Updated",
          message: "Pack cover successfully updated.",
          isSuccess: true
        });
      },
      onError: (error) => {
        showNotification({
          title: "Error",
          message: `Failed to upload cover. ${parseErrors(error.response?.data)}`,
          isSuccess: false
        });
      }
    });
  };

  const handleDeleteCover = () => {
    deleteCover(packId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pack', packId] });
        showNotification({
          title: "Cover Removed",
          message: "Pack cover successfully deleted.",
          isSuccess: true
        });
      },
      onError: (error) => {
        showNotification({
          title: "Error",
          message: `Failed to delete cover. ${parseErrors(error.response?.data)}`,
          isSuccess: false
        });
      }
    });
  };

  const { mutate: activatePack, isPending: isActivating } = useActivatePackMutation({
    onSuccess: () => {
      showNotification({ title: "Pack Activated", message: "Your pack is now active.", isSuccess: true });
      queryClient.invalidateQueries({ queryKey: ['pack', packId] });
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to activate the pack. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const { mutate: publishPack, isPending: isPublishing } = usePublishPackMutation({
    onSuccess: () => {
      showNotification({ title: "Pack Published", message: "Your pack is now public.", isSuccess: true });
      queryClient.invalidateQueries({ queryKey: ['pack', packId] });
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to publish the pack. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const isDraft = packData?.status?.toUpperCase() === 'DRAFT';
  const isActivePrivate = packData?.status?.toUpperCase() === 'ACTIVE' && !packData?.is_public;

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isFormValid = isNameValid && description.trim() !== '';

  const onSubmit = (data) => {
    if (!isFormValid) return;

    updatePack({
      packId,
      packData: {
        name: data.name,
        description: description,
      }
    }, {
      onSuccess: () => {
        showNotification({
          title: "Changes Saved!",
          message: "Your card-pack has been successfully updated. Redirecting",
          isSuccess: true,
        });

        setTimeout(() => {
          navigate(`/edit/card-pack/${packId}/words`);
          closeNotification();
        }, 2500);
      },
      onError: (error) => {
        showNotification({
          title: "Error",
          message: `Failed to update the card-pack. ${parseErrors(error.response?.data)}`,
          isSuccess: false,
        });
      }
    });
  };

  if (isPackLoading) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasCover = !!(packData?.cover_url || packData?.image_url);

  return (
    <div className='flex flex-col w-full gap-8 relative'>
      <RowNavigation links={navLinks} />

      <div className='flex flex-col w-full gap-4'>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit the card-pack</h1>
          <Link
            to={`/edit/card-pack/${packId}/words`}
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the card-pack words →
          </Link>
        </div>
        <span className='text-label text-text-label font-noto'>
          Give your card-pack a unique name, image, and description to make it stand out in the gallery.
        </span>
      </div>

      <div className='w-full flex items-center gap-16'>
        <TransparentInput
          width='w-[310px]'
          label='Name your card pack'
          placeholder='Castles in Ukraine'
          {...register('name')}
          error={!!errors.name}
          isValid={isNameValid}
          helpText={errors.name ? errors.name.message : 'You can rename it here'}
          successText='Correct Format'
        />

        <StatusLabel status={parseUpperCase(packData?.status) || 'Draft'} helpText='Current progress state'/>
      </div>

      <div className='w-full flex items-center gap-23'>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="image"
            render={() => (
              <ImageInput
                value={currentImage}
                onChange={handleFileSelect}
                error={!!errors.image}
                isValid={!!currentImage && !errors.image}
                helpText={errors.image ? errors.image.message : 'Png, jpg, jpeg & webp files are supported'}
                successText='Image uploaded'
              />
            )}
          />
          {hasCover && (
            <button
              onClick={handleDeleteCover}
              disabled={isDeleting}
              className="text-text-warning hover:text-red-600 transition-colors text-label font-noto self-end flex items-center gap-2"
            >
              {isDeleting ? <Spinner size="sm" /> : (
                <>
                  <img src={cross} alt="Delete" className="w-3 h-3" />
                  Delete cover
                </>
              )}
            </button>
          )}
        </div>

        <StatusLabel
          title='Deck’s availability'
          status={packData?.is_public ? 'Public' : 'Private'}
          helpText='Public access is only available after activation.'
        />
      </div>

      <TextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className='flex items-center justify-between w-full mt-4'>
        <Button
          disabled={!isFormValid || isUpdating || isUploading}
          onClick={handleSubmit(onSubmit)}
        >
          {isUpdating ? <Spinner size='sm' /> : 'Save Changes'}
        </Button>

        <div className='flex items-center gap-3'>
          {isDraft && (
            <Button
              onClick={() => activatePack(packId)}
              disabled={isActivating || isUpdating}
            >
              {isActivating ? <Spinner size="sm" /> : 'Activate'}
            </Button>
          )}

          {isActivePrivate && (
            <Button
              onClick={() => publishPack(packId)}
              disabled={isPublishing || isUpdating}
            >
              {isPublishing ? <Spinner size="sm" /> : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={imageSrc}
        onSave={handleCropSave}
        aspect={3 / 2}
        isUploading={isUploading}
      />
    </div>
  );
};

export default CardPackEditor;
