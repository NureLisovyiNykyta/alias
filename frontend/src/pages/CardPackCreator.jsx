import React, { useState } from 'react';
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

const CardPackCreator = () => {
  const { showNotification, closeNotification } = useNotification();
  const navigate = useNavigate();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Card Pack Creator', path: null }
  ];

  const [name, setName] = useState('');
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

  const isFormValid = name.trim() !== '' && description.trim() !== '' && selectedType !== null;

  const handleSave = () => {
    if (!isFormValid) return;

    createPack({
      name: name,
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
          Click on any cell in the grid to customize its individual properties,
          such as task type, time limits, and point values.
        </span>
      </div>

      <div className='w-full flex items-center gap-16'>
        <TransparentInput
          width='w-[310px]'
          label='Name your card pack'
          placeholder='Castles in Ukraine'
          helpText='You will be able to rename it later'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <StatusLabel status='Draft' helpText='Current progress state'/>
      </div>

      <div className='w-full flex items-center gap-23'>
        <ImageInput/>
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
        onClick={handleSave}
      >
        {isPending ? <Spinner size='sm' /> : 'Save to Draft'}
      </Button>
    </div>
  );
};

export default CardPackCreator;
