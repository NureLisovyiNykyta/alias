import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import RowNavigation from '@/components/nav/RowNavigation.jsx';
import TransparentInput from '@/components/inputs/TransparentInput.jsx';
import ImageInput from '@/components/inputs/ImageInput.jsx';
import MapTemplateSelector from '@/components/inputs/MapTemplateSelector.jsx';
import { Button } from '@/components/buttons/Button.jsx';
import Spinner from '@/components/layouts/Spinner.jsx';
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useMapTemplatesQuery, useCreateMapMutation, useUploadMapCoverMutation } from "@/api/maps";
import StatusLabel from "@/components/cards/StatusLabel.jsx";
import ImageCropperModal from "@/components/modals/ImageCropperModal.jsx";

const createMapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().refine((file) => file !== null && file !== undefined, "Image is required"),
});

const MapCreator = () => {
  const navigate = useNavigate();
  const { showNotification, closeNotification } = useNotification();

  const [imageSrc, setImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Map Creator', path: null }
  ];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createMapSchema),
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

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: rawTemplates, isLoading: isTemplatesLoading } = useMapTemplatesQuery();

  const templates = rawTemplates?.map(template => ({
    ...template,
    label: template.name,
    previewImage: template.model_3d_url
  })) || [];

  const { mutate: createMapDraft, isPending: isCreating } = useCreateMapMutation();
  const { mutate: uploadCover, isPending: isUploading } = useUploadMapCoverMutation();

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
    setValue('image', file, { shouldValidate: true, shouldDirty: true });
    setIsCropperOpen(false);
    setImageSrc(null);
  };

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isImageValid = !!currentImage && !errors.image;
  const isFormValid = isNameValid && isImageValid && selectedTemplate !== null;
  const isBusy = isCreating || isUploading;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    createMapDraft({
      name: data.name,
      template_id: selectedTemplate.id
    }, {
      onSuccess: (response) => {
        const newMapId = response.id;

        uploadCover({ mapId: newMapId, file: data.image }, {
          onSuccess: () => {
            showNotification({
              title: "Draft Saved!",
              message: "Your new map and cover have been successfully created.",
              isSuccess: true,
            });

            setTimeout(() => {
              navigate(`/edit/map/${newMapId}/fields`);
              closeNotification();
            }, 2500);
          },
          onError: () => {
            showNotification({
              title: "Error",
              message: "Map created, but failed to upload the cover.",
              isSuccess: false,
            });
          }
        });
      },
      onError: () => {
        showNotification({
          title: "Error",
          message: "Failed to create the map.",
          isSuccess: false,
        });
      }
    });
  };

  return (
    <div className="flex flex-col w-full gap-8 relative">
      <RowNavigation links={navLinks}/>

      <div className="flex flex-col w-full gap-4">
        <h1 className="text-h1">Create new map</h1>
        <span className="text-label text-text-label font-noto">
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
          helpText={errors.name ? errors.name.message : 'You will be able to rename it later'}
          successText='Correct Format'
        />

        <StatusLabel status='Draft' helpText='Current progress state'/>
      </div>

      <div className='w-full flex gap-23'>
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
              isValid={isImageValid}
              helpText={errors.image ? errors.image.message : 'Png, jpg & jpeg files are supported'}
              successText='Correct Format'
            />
          )}
        />

        <StatusLabel
          title='Map’s availability'
          status='Private'
          helpText="Public access is only available after activation. Note that for the map to function correctly, all associated card packs must be set to public."
          width='max-w-[287px]'
        />
      </div>

      {isTemplatesLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Spinner size="lg"/>
          <span className="text-p font-noto text-text-label">Loading templates</span>
        </div>
      ) : (
        <MapTemplateSelector
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />
      )}

      <Button
        className="self-end"
        disabled={!isFormValid || isBusy}
        onClick={handleSubmit(onSubmit)}
      >
        {isBusy ? <Spinner size='sm'/> : 'Save to Draft'}
      </Button>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={imageSrc}
        onSave={handleCropSave}
        aspect={3 / 2}
      />
    </div>
  );
};

export default MapCreator;
