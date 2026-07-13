import React, { forwardRef } from 'react';

const TextArea = forwardRef(({
                               label = 'Describe your pack',
                               placeholder = 'Enter the description',
                               helpText = 'The proper description will help you to distinguish the pack among others',
                               id,
                               error,
                               isValid = false,
                               successText = "Correct format",
                               ...props
                             }, ref) => {
  let borderColorClass = 'border-text-label';
  if (error) {
    borderColorClass = 'border-red-500';
  } else if (isValid) {
    borderColorClass = 'border-decorative-700';
  }

  let messageToDisplay = error || helpText;
  let messageColorClass = 'text-text-label';

  if (error) {
    messageColorClass = 'text-red-500';
  } else if (isValid) {
    messageToDisplay = successText;
    messageColorClass = 'text-decorative-700';
  }

  return (
    <div className="flex flex-col gap-2 w-[636px]">
      {label && (
        <label htmlFor={id} className="font-noto text-p">{label}</label>
      )}

      <div
        className={`flex bg-surface border ${borderColorClass} rounded-[8px] py-[10px] px-4 w-full h-[144px] transition-colors`}
      >
        <textarea
          id={id}
          placeholder={placeholder}
          ref={ref}
          className="bg-transparent w-full h-full outline-none text-label font-noto placeholder:text-text-label resize-none"
          {...props}
        />
      </div>

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

TextArea.displayName = 'TextArea';

export default TextArea;
