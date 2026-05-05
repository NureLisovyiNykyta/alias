import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RowNavigation from '@/components/RowNavigation.jsx';
import TransparentInput from '@/components/TransparentInput.jsx';
import ImageInput from '@/components/ImageInput.jsx';
import MapTemplateSelector from '@/components/MapTemplateSelector.jsx';
import { Button } from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useMapTemplatesQuery, useCreateMapMutation } from "@/api/maps";
import StatusLabel from "@/components/StatusLabel.jsx";

const MapCreator = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Map Creator', path: null }
  ];

  const [name, setName] = useState('');
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

  const isFormValid = name.trim() !== '' && selectedTemplate !== null;

  const handleSave = () => {
    if (!isFormValid) return;

    createMapDraft({
      name: name,
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

      <div className="w-full flex items-start gap-12">
        <TransparentInput
          width="w-[310px]"
          label="Name your map"
          placeholder="Castles in Ukraine"
          helpText="You will be able to rename it later"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="w-[310px]">
          <ImageInput
            label="Choose the image"
            placeholder="Upload an image"
            helpText="Png, jpg & jpeg files are supported"
            wide={true}
          />
        </div>

        <StatusLabel status='Draft'/>
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
        onClick={handleSave}
      >
        {isPending ? <Spinner size='sm'/> : 'Save to Draft'}
      </Button>

    </div>
  );
};

export default MapCreator;
