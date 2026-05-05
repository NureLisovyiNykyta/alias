import React, { useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate } from "react-router-dom";
import TransparentInput from "@/components/TransparentInput.jsx";
import ImageInput from "@/components/ImageInput.jsx";
import StatusLabel from "@/components/StatusLabel.jsx";
import TextArea from "@/components/TextArea.jsx";
import { Button } from "@/components/Button.jsx";
import Spinner from "@/components/Spinner.jsx";
import RowNavigation from "@/components/RowNavigation.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";

import { usePackQuery, useUpdatePackMutation } from "@/api/card-packs";
import { parseUpperCase } from "@/utils/parseUpperCase.js";

const updatePackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().nullable(),
});

const CardPackEditor = () => {
  const { id: packId } = useParams();
  const navigate = useNavigate();
  const { showNotification, closeNotification } = useNotification();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'My Packs', path: '/my-packs' },
    { id: 3, label: 'Edit Card Pack', path: null }
  ];

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

  useEffect(() => {
    if (packData) {
      reset({
        name: packData.name || '',
        image: packData.image_url || null,
      });
      setDescription(packData.description || '');
    }
  }, [packData, reset]);

  const { mutate: updatePack, isPending } = useUpdatePackMutation({
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
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to update the card-pack.",
        isSuccess: false,
      });
    },
  });

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
    });
  };

  if (isPackLoading) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className='flex flex-col w-full gap-8'>
      <RowNavigation links={navLinks} />

      <div className='flex flex-col w-[492px] gap-4'>
        <h1 className='text-h1'>Edit card-pack</h1>
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
        <Controller
          control={control}
          name="image"
          render={({ field: { onChange, value } }) => (
            <ImageInput
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
          title='Deck’s availability'
          status={packData?.is_public ? 'Public' : 'Private'}
          helpText='Public access is only available after activation.'
        />
      </div>

      <TextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Button
        className='self-end mt-4'
        disabled={!isFormValid || isPending}
        onClick={handleSubmit(onSubmit)}
      >
        {isPending ? <Spinner size='sm' /> : 'Save Changes'}
      </Button>
    </div>
  );
};

export default CardPackEditor;
