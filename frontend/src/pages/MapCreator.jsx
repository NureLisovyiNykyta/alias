import React, { useState } from 'react';
import RowNavigation from '@/components/RowNavigation.jsx';
import TransparentInput from '@/components/TransparentInput.jsx';
import ImageInput from '@/components/ImageInput.jsx';
import MapTemplateSelector from '@/components/MapTemplateSelector.jsx';
import { Button } from '@/components/Button.jsx';

const MapCreator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Map Creator', path: null }
  ];

  const MOCK_TEMPLATES = [
    { id: 1, label: 'Classic Animals' },
    { id: 2, label: 'Classic IT words' },
    { id: 3, label: 'Classic Food' },
  ];

  return (
    <div className="flex flex-col w-full gap-8">
      <RowNavigation links={navLinks} />

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
        />

        <div className="w-[310px]">
          <ImageInput
            label="Choose the image"
            placeholder="Upload an image"
            helpText="Png, jpg & jpeg files are supported"
            wide={true}
          />
        </div>

      </div>

      <MapTemplateSelector
        templates={MOCK_TEMPLATES}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
      />

      <Button
        className="self-end"
        disabled={true}
      >
        Save to Draft
      </Button>

    </div>
  );
};

export default MapCreator;
