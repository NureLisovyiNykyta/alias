import { Link } from 'react-router-dom';
import RowNavigation from '@/components/RowNavigation.jsx';
import TransparentInput from '@/components/TransparentInput.jsx';
import ImageInput from '@/components/ImageInput.jsx';
import StatusLabel from '@/components/StatusLabel.jsx';
import { Button } from '@/components/Button.jsx';

const EditMapValues = () => {
  const navLinks = [
    { id: 1, label: 'Main page', path: '/' },
    { id: 2, label: 'Edit the map values' },
  ];

  return (
    <div className="flex flex-col w-full gap-8">
      <RowNavigation links={navLinks} />

      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit the map values</h1>
          <button
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the map fields →
          </button>
        </div>
        <span className="text-label text-text-label font-noto w-[492px]">
          Set up your map by filling in the required details and selecting your preferences.
        </span>
      </div>

      <div className="w-full flex items-start gap-12 mt-4">
        <TransparentInput
          width="w-[310px]"
          label="Name your map"
          placeholder="Castles in Ukraine"
          helpText="You will be able to rename it later"
        />

        <div className="w-[280px]">
          <ImageInput
            label="Choose the image"
            placeholder="Upload an image"
            helpText="Png, jpg & jpeg files are supported"
            wide={true}
          />
        </div>

        <StatusLabel status="Draft" />
      </div>

      <Button className="self-end">
        Update
      </Button>
    </div>
  );
};

export default EditMapValues;
