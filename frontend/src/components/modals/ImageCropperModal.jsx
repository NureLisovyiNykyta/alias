import { Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/buttons/Button.jsx';
import Spinner from '@/components/layouts/Spinner.jsx';
import { getCroppedImg } from '@/utils/cropImage.js';

const ImageCropperModal = ({
                             isOpen,
                             onClose,
                             imageSrc,
                             onSave,
                             aspect = 3 / 2,
                             isUploading = false
                           }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = (croppedArea, currentCroppedAreaPixels) => {
    setCroppedAreaPixels(currentCroppedAreaPixels);
  };

  const handleSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], 'cover.jpg', { type: 'image/jpeg' });
      onSave(file);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!isUploading ? onClose : undefined}
          />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="relative bg-surface p-6 rounded-[16px] w-[90vw] max-w-[500px] flex flex-col gap-4 shadow-xl">
            <h2 className="text-h2 font-noto">Crop cover image</h2>

            <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-black/10">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex justify-end gap-4 mt-2">
              <Button
                variant="tertiary"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUploading}
              >
                {isUploading ? <Spinner size="sm" /> : "Save Cover"}
              </Button>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
};

export default ImageCropperModal;
