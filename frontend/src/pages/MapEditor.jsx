import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from '@tanstack/react-query';
import cross from "@/assets/redCross.svg";
import RowNavigation from '@/components/nav/RowNavigation.jsx';
import TransparentInput from '@/components/inputs/TransparentInput.jsx';
import ImageInput from '@/components/inputs/ImageInput.jsx';
import { Button } from '@/components/buttons/Button.jsx';
import Spinner from '@/components/layouts/Spinner.jsx';
import StatusLabel from "@/components/cards/StatusLabel.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import ImageCropperModal from "@/components/modals/ImageCropperModal.jsx";
import {
  useMapQuery,
  useUpdateMapMutation,
  useUploadMapCoverMutation,
  useDeleteMapCoverMutation,
  useActivateMapMutation,
  usePublishMapMutation
} from "@/api/maps";
import { parseUpperCase } from "@/utils/parseUpperCase.js";
import { parseErrors } from "@/utils/parseErrors.js";

const updateMapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().nullable(),
});

const MapEditor = () => {
  const { id: mapId } = useParams();
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
    resolver: zodResolver(updateMapSchema),
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

  const { data: mapData, isLoading: isMapLoading } = useMapQuery(mapId);

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: `${mapData?.name} Map`, path: `/map/${mapId}` },
    { id: 3, label: 'Edit Map', path: null }
  ];

  useEffect(() => {
    if (mapData) {
      reset({
        name: mapData.name || '',
        image: mapData.cover_url || null,
      });
    }
  }, [mapData, reset]);

  const { mutate: updateMap, isPending: isUpdating } = useUpdateMapMutation();
  const { mutate: uploadCover, isPending: isUploading } = useUploadMapCoverMutation();
  const { mutate: deleteCover, isPending: isDeleting } = useDeleteMapCoverMutation();

  const handleFileSelect = (e) => {
    const file = e.target?.files ? e.target.files[0] : e;
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImageSrc(reader.result);
        setIsCropperOpen(true);
      };
    }
  };

  const handleCropSave = (file) => {
    uploadCover({ mapId, file }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['map', mapId] });
        setIsCropperOpen(false);
        setImageSrc(null);
        showNotification({
          title: "Cover Updated",
          message: "Map cover successfully updated.",
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
    deleteCover(mapId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['map', mapId] });
        showNotification({
          title: "Cover Removed",
          message: "Map cover successfully deleted.",
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

  const { mutate: activateMap, isPending: isActivating } = useActivateMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Activated", message: "Your map is now active.", isSuccess: true });
      queryClient.invalidateQueries({ queryKey: ['map', mapId] });
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to activate the map. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const { mutate: publishMap, isPending: isPublishing } = usePublishMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Published", message: "Your map is now public.", isSuccess: true });
      queryClient.invalidateQueries({ queryKey: ['map', mapId] });
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to publish the map. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const isDraft = mapData?.status?.toUpperCase() === 'DRAFT';
  const isActivePrivate = mapData?.status?.toUpperCase() === 'ACTIVE' && !mapData?.is_public;

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isFormValid = isNameValid;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    updateMap({
      mapId,
      mapData: {
        name: data.name,
      }
    }, {
      onSuccess: () => {
        showNotification({
          title: "Changes Saved!",
          message: "Your map has been successfully updated.",
          isSuccess: true,
        });

        setTimeout(() => {
          navigate(`/edit/map/${mapId}/fields`);
          closeNotification();
        }, 2500);
      },
      onError: (error) => {
        showNotification({
          title: "Error",
          message: `Failed to update the map. ${parseErrors(error.response?.data)}`,
          isSuccess: false,
        });
      }
    });
  };

  if (isMapLoading) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasCover = !!mapData?.cover_url;

  return (
    <div className="flex flex-col w-full gap-8 relative">
      <RowNavigation links={navLinks}/>

      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit the map values</h1>
          <Link
            to={`/edit/map/${mapId}/fields`}
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the map fields →
          </Link>
        </div>
        <span className="text-label text-text-label font-noto w-[492px]">
          Set up your map by filling in the required details and selecting your preferences.
        </span>
      </div>

      <div className='w-full flex items-center gap-16'>
        <TransparentInput
          width="w-[310px]"
          label="Name your map"
          placeholder="Castles in Ukraine"
          {...register('name')}
          error={!!errors.name}
          isValid={isNameValid}
          helpText={errors.name ? errors.name.message : 'You can rename it here'}
          successText='Correct format'
        />

        <StatusLabel status={parseUpperCase(mapData?.status) || 'Draft'} helpText='Current progress state'/>
      </div>

      <div className='w-full flex gap-23'>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="image"
            render={() => (
              <ImageInput
                label="Choose the image"
                placeholder="Upload an image"
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
              className="text-text-warning hover:text-red-600 transition-colors text-label font-noto self-end flex items-center gap-2 mt-1"
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
          title='Map’s availability'
          status={mapData?.is_public ? 'Public' : 'Private'}
          helpText="Public access is only available after activation. Note that for the map to function correctly, all associated card packs must be set to public."
          width='max-w-[287px]'
        />
      </div>

      <div className='flex items-center justify-between w-full mt-4'>
        <Button
          disabled={!isFormValid || isUpdating || isUploading}
          onClick={handleSubmit(onSubmit)}
        >
          {isUpdating ? <Spinner size='sm'/> : 'Save Changes'}
        </Button>

        <div className='flex items-center gap-3'>
          {isDraft && (
            <Button
              onClick={() => activateMap(mapId)}
              disabled={isActivating || isUpdating}
            >
              {isActivating ? <Spinner size="sm" /> : 'Activate'}
            </Button>
          )}

          {isActivePrivate && (
            <Button
              onClick={() => publishMap(mapId)}
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

export default MapEditor;
