import React from 'react';
import DropDown from '@/components/DropDown';
import mapPreviewIcon from '@/assets/mapPreview.svg';

const MapTemplateSelector = ({
                               templates = [],
                               selectedTemplate,
                               onSelectTemplate
                             }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <h2 className="text-h2">Select map template</h2>

      <div className="flex items-center justify-center bg-surface rounded-[12px] py-15 px-4 gap-[136px] w-full">
        <div className="flex flex-col gap-2">
          <DropDown
            width="w-[280px]"
            placeholder="Choose the map template"
            options={templates}
            value={selectedTemplate}
            onChange={onSelectTemplate}
          />
          <span className="text-label text-text-label font-noto">
            Pick an option from the templates
          </span>
        </div>

        <div className="flex flex-col items-center justify-center w-[420px] h-[270px] border border-text-label rounded-[12px] p-6 text-center overflow-hidden">
          {selectedTemplate && selectedTemplate.previewImage ? (
            <img
              src={selectedTemplate.previewImage}
              alt={selectedTemplate.label}
              className="w-full h-full object-cover rounded-[8px]"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img src={mapPreviewIcon} alt="Map Placeholder" />
              <span className="text-label text-text-label font-noto">
                Preview will appear here after selecting a template
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapTemplateSelector;
