import React, { useState } from 'react';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import TransparentInput from "@/components/TransparentInput.jsx";
import ImageInput from "@/components/ImageInput.jsx";
import StatusLabel from "@/components/StatusLabel.jsx";
import TextArea from "@/components/TextArea.jsx";
import { Button } from "@/components/Button.jsx";
import DropDown from "@/components/DropDown.jsx";
import Spinner from "@/components/Spinner.jsx";
import { useCreatePackMutation, usePackTypesQuery } from "@/api/card-packs";
import RowNavigation from "@/components/RowNavigation.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useNavigate } from "react-router-dom";

const createPackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.any().refine((file) => file !== null && file !== undefined, "Image is required"),
});

const CardPackCreator = () => {
  const { showNotification, closeNotification } = useNotification();
  const navigate = useNavigate();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Card Pack Creator', path: null }
  ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPackSchema),
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
  const [selectedType, setSelectedType] = useState(null);

  const { data: rawPackTypes, isLoading: isTypesLoading } = usePackTypesQuery();

  const packTypes = rawPackTypes?.map(type => ({
    ...type,
    label: type.name
  })) || [];

  const { mutate: createPack, isPending } = useCreatePackMutation({
    onSuccess: (data) => {
      showNotification({
        title: "Draft Saved!",
        message: "Your new card-pack has been successfully created. Redirecting.",
        isSuccess: true,
      });

      setTimeout(() => {
        navigate(`/edit/card-pack/${data.id}/words`);
        closeNotification();
      }, 2500);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to create the card-pack.",
        isSuccess: false,
      });
    },
  });

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.name;
  const isImageValid = !!currentImage && !errors.image;
  const isFormValid = isNameValid && isImageValid && description.trim() !== '' && selectedType !== null;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    createPack({
      name: data.name,
      description: description,
      type_id: selectedType.id
    });
  };

  return (
    <div className='flex flex-col w-full gap-8'>
      <RowNavigation links={navLinks} />

      <div className='flex flex-col w-[492px] gap-4'>
        <h1 className='text-h1'>Create new card-pack</h1>
        <span className='text-label text-text-label font-noto'>
          Fill in the details below to set up your new card pack
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
          helpText={errors.name ? errors.name.message : 'You will be able to rename it later'}
          successText='Correct Format'
        />

        <StatusLabel status='Draft' helpText='Current progress state'/>
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
              isValid={isImageValid}
              helpText={errors.image ? errors.image.message : 'Png, jpg & jpeg files are supported'}
              successText='Correct Format'
            />
          )}
        />
        <StatusLabel
          title='Deck’s availability'
          status='Private'
          helpText='Public access is only available after activation.'
        />
      </div>

      <TextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className='flex items-center gap-8'>
        <div className='flex flex-col gap-2'>
          {isTypesLoading ? (
            <div className="flex items-center gap-4 h-[48px]">
              <Spinner size="sm" />
              <span className="text-p font-noto text-text-label">Loading types</span>
            </div>
          ) : (
            <DropDown
              label='Choose the card pack type'
              value={selectedType}
              onChange={setSelectedType}
              options={packTypes}
              width='w-[260px]'
            />
          )}
          <span className='text-label font-noto text-text-label'>Choose the category of cards</span>
        </div>

        <div className='flex w-[530px] flex-col gap-4'>
          <h2 className={`text-h2 ${selectedType ? 'text-text' : 'text-text-label'}`}>
            {selectedType ? selectedType.label : 'No Pack Selected'}
          </h2>
          <div>
            {selectedType ? (
              <p className='font-noto text-p'>{selectedType.description}</p>
            ) : (
              <>
                <p className='font-noto text-text-label'>Please select a pack type to view its description.</p>
                <p className='font-noto text-text-label'>Once selected, the specific set description and card attributes will appear here.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        className='self-end'
        disabled={!isFormValid || isPending}
        onClick={handleSubmit(onSubmit)}
      >
        {isPending ? <Spinner size='sm' /> : 'Save to Draft'}
      </Button>
    </div>
  );
};

export default CardPackCreator;
