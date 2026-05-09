import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import RowNavigation from '@/components/nav/RowNavigation.jsx';
import TransparentInput from '@/components/inputs/TransparentInput.jsx';
import ImageInput from '@/components/inputs/ImageInput.jsx';
import { Button } from '@/components/buttons/Button.jsx';
import Spinner from '@/components/layouts/Spinner.jsx';
import StatusLabel from "@/components/cards/StatusLabel.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useMapQuery, useUpdateMapMutation } from "@/api/maps";
import { parseUpperCase } from "@/utils/parseUpperCase.js";

const updateMapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().nullable(),
});

const MapEditor = () => {
  const { id: mapId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Edit Map', path: null }
  ];

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

  useEffect(() => {
    if (mapData) {
      reset({
        name: mapData.name || '',
        image: mapData.cover_url || null,
      });
    }
  }, [mapData, reset]);

  const { mutate: updateMap, isPending } = useUpdateMapMutation({
    onSuccess: () => {
      showNotification({
        title: "Changes Saved!",
        message: "Your map has been successfully updated.",
        isSuccess: true,
      });

      setTimeout(() => {
        navigate(`/edit/map/${mapId}/fields`);
      }, 2500);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to update the map.",
        isSuccess: false,
      });
    },
  });

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isFormValid = isNameValid;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    updateMap({
      mapId,
      mapData: {
        name: data.name,
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

  return (
    <div className="flex flex-col w-full gap-8">
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

        <StatusLabel status={parseUpperCase(mapData?.status)|| 'Draft'} helpText='Current progress state'/>
      </div>

      <div className='w-full flex gap-23'>
        <Controller
          control={control}
          name="image"
          render={({ field: { onChange, value } }) => (
            <ImageInput
              label="Choose the image"
              placeholder="Upload an image"
              value={value}
              onChange={onChange}
              error={!!errors.image}
              isValid={!!value && !errors.image}
              helpText={errors.image ? errors.image.message : 'Png, jpg & jpeg files are supported'}
              successText='Image uploaded'
            />
          )}
        />

        <StatusLabel
          title='Map’s availability'
          status={mapData?.is_public ? 'Public' : 'Private'}
          helpText="Public access is only available after activation. Note that for the map to function correctly, all associated card packs must be set to public."
          width='max-w-[287px]'
        />
      </div>

      <Button
        className="self-end"
        disabled={!isFormValid || isPending}
        onClick={handleSubmit(onSubmit)}
      >
        {isPending ? <Spinner size='sm'/> : 'Save Changes'}
      </Button>
    </div>
  );
};

export default MapEditor;