import React, { forwardRef, useState } from 'react';
import upload from '@/assets/upload.svg';

const ImageInput = forwardRef(({
                                 label = 'Choose the image',
                                 placeholder = 'Upload an image',
                                 helpText = 'Png, jpg & jpeg files are supported',
                                 id,
                                 error,
                                 isValid = false,
                                 successText = "File attached",
                                 wide = false,
                                 onChange,
                                 value,
                                 ...props
                               }, ref) => {
  const [fileName, setFileName] = useState('');

  let borderColorClass = 'border-text-label';
  if (error) {
    borderColorClass = 'border-red-500';
  } else if (isValid) {
    borderColorClass = 'border-decorative-700';
  }

  let messageToDisplay = error ? helpText : (isValid ? successText : helpText);
  let messageColorClass = 'text-text-label';

  if (error) {
    messageColorClass = 'text-red-500';
  } else if (isValid) {
    messageColorClass = 'text-decorative-700';
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName('');
    }

    if (onChange) {
      onChange(event);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${wide ? 'w-full' : 'w-[280px]'}`}>
      <span className="font-noto text-p">{label}</span>

      <label
        htmlFor={id || "image-upload"}
        className={`flex bg-surface items-center border ${borderColorClass} rounded-[8px] py-[10px] px-4 justify-between h-[48px] transition-colors cursor-pointer hover:border-gray-400`}
      >
        <span className={`text-label font-noto truncate ${fileName ? 'text-text' : 'text-text-label'}`}>
          {fileName || placeholder}
        </span>

        <img src={upload} alt="Upload an image"/>

        <input
          id={id || "image-upload"}
          type="file"
          accept=".png, .jpg, .jpeg, .webp"
          ref={ref}
          className="hidden"
          onChange={handleFileChange}
          {...props}
        />
      </label>

      {messageToDisplay && (
        <div className='flex items-center justify-between'>
          <span className={`text-label font-noto ${messageColorClass}`}>
            {messageToDisplay}
          </span>
        </div>
      )}
    </div>
  );
});

ImageInput.displayName = 'ImageInput';

export default ImageInput;
