import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import RowNavigation from '@/components/RowNavigation.jsx';
import TransparentInput from '@/components/TransparentInput.jsx';
import ImageInput from '@/components/ImageInput.jsx';
import MapTemplateSelector from '@/components/MapTemplateSelector.jsx';
import { Button } from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useMapTemplatesQuery, useCreateMapMutation } from "@/api/maps";
import StatusLabel from "@/components/StatusLabel.jsx";

const createMapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().refine((file) => file !== null && file !== undefined, "Image is required"),
});

const MapCreator = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Map Creator', path: null }
  ];

  const {
    register,
    handleSubmit,
    control,
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

  const { mutate: createMapDraft, isPending } = useCreateMapMutation({
    onSuccess: (data) => {
      showNotification({
        title: "Draft Saved!",
        message: "Your new map has been successfully created. Redirecting.",
        isSuccess: true,
      });

      setTimeout(() => {
        navigate(`/edit/map/${data.id}/fields`);
      }, 2500);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to create the map.",
        isSuccess: false,
      });
    },
  });

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isImageValid = !!currentImage && !errors.image;
  const isFormValid = isNameValid && isImageValid && selectedTemplate !== null;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    createMapDraft({
      name: data.name,
      template_id: selectedTemplate.id
    });
  };

  return (
    <div className="flex flex-col w-full gap-8">
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
          successText='Сorrect Аormat'
        />

        <StatusLabel status='Draft' helpText='Current progress state'/>
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
              isValid={isImageValid}
              helpText={errors.image ? errors.image.message : 'Png, jpg & jpeg files are supported'}
              successText='Сorrect Format'
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
        disabled={!isFormValid || isPending}
        onClick={handleSubmit(onSubmit)}
      >
        {isPending ? <Spinner size='sm'/> : 'Save to Draft'}
      </Button>

    </div>
  );
};

export default MapCreator;
