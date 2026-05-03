const TransparentInput = ({ width = 'w-full', type = 'text', label, placeholder, helpText  }) => {
  return (
    <div className={`${width} flex flex-col gap-4`}>
      <label htmlFor={type} className='text-p font-noto'>{label}</label>
      <div className='flex flex-col gap-4 pb-2 border-b border-text-label w-full'>
        <input placeholder={placeholder} type={type} name={type} id="" className='bg-transparent w-full outline-none text-h2 placeholder:text-text-label'/>
      </div>
      <span className='text-label text-text-label font-noto'>{helpText}</span>
    </div>
  );
};

export default TransparentInput;
