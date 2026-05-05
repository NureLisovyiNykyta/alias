import React, { forwardRef } from 'react';

const TransparentInput = forwardRef(({
                                       width = 'w-full',
                                       type = 'text',
                                       label,
                                       placeholder,
                                       helpText,
                                       error,
                                       isValid = false,
                                       successText = "Correct format",
                                       id,
                                       ...props
                                     }, ref) => {

  let borderColorClass = 'border-text-label';
  if (error) {
    borderColorClass = 'border-red-500';
  } else if (isValid) {
    borderColorClass = 'border-decorative-700';
  }

  let messageToDisplay = helpText;
  let messageColorClass = 'text-text-label';

  if (error) {
    messageColorClass = 'text-red-500';
  } else if (isValid) {
    messageToDisplay = successText;
    messageColorClass = 'text-decorative-700';
  }

  const inputId = id || type;

  return (
    <div className={`${width} flex flex-col gap-4`}>
      <label htmlFor={inputId} className='text-p font-noto'>{label}</label>
      <div className={`flex flex-col gap-4 pb-2 border-b ${borderColorClass} w-full transition-colors`}>
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          ref={ref}
          className='bg-transparent w-full outline-none text-h2 placeholder:text-text-label'
          {...props}
        />
      </div>
      {messageToDisplay && (
        <span className={`text-label font-noto transition-colors ${messageColorClass}`}>
          {messageToDisplay}
        </span>
      )}
    </div>
  );
});

TransparentInput.displayName = 'TransparentInput';

export default TransparentInput;
