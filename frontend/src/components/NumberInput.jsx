const NumberInput = ({ measureUnit, placeholder, title = 'Status', helpText = null, width = '', value = 0, onChange, min = 1, disableNegative = false }) => {
  const charsCount = String(value).length;

  return (
    <div className='flex flex-col gap-4 self-start max-w-[330px]'>
      <h2 className='text-h2'>{title}</h2>
      <div className='flex items-center gap-4'>
        <input
          min={min}
          type='number'
          className='h-12 min-w-12 w-fit text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-2 border-surface shadow-buttons rounded-[12px] outline-none text-btn font-noto placeholder:text-text-label'
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ width: `${charsCount + 2}ch` }}
          onKeyDown={(e) => {
            if (disableNegative && (e.key === '-' || e.key === 'e')) {
              e.preventDefault();
            }
          }}
        />

        <p className='font-noto'>{`${measureUnit}${Number(value) !== 1 ? 's': ''}`}</p>
      </div>
      {helpText && <span className={`text-label font-noto text-text-label
      ${!!width ? width : 'w-fit'}`}>{helpText}</span>}
    </div>
  );
};

export default NumberInput;
