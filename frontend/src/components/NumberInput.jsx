const NumberInput = ({ measureUnit, placeholder, title = 'Status', helpText = null, width = '', value = 0, onChange }) => {
  return (
    <div className='flex flex-col gap-4 self-start max-w-[330px]'>
      <h2 className='text-h2'>{title}</h2>
      <div className='flex items-center gap-4'>
        <input
          type='number'
          className='h-12 w-12 flex items-center justify-center border-2 border-surface shadow-buttons rounded-[12px] outline-none text-btn font-noto placeholder:text-text-label'
          placeholder={`${placeholder} ${value > 1 ? 's': ''}`}
          value={value}
          onChange={onChange}
        />

        <p className='font-noto'>{measureUnit}</p>
      </div>
      {helpText && <span className={`text-label font-noto text-text-label
      ${!!width ? width : 'w-fit'}`}>{helpText}</span>}
    </div>
  );
};

export default NumberInput;
