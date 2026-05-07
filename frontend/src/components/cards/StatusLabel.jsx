const StatusLabel = ({ status, title = 'Status', helpText = null, width = '' }) => {
  return (
    <div className='flex flex-col gap-4 self-start'>
      <h2 className='text-h2'>{title}</h2>
      <div className='h-12 w-fit flex items-center justify-center border-2 px-8 border-surface shadow-buttons rounded-[12px]'>
        <span className='text-label font-noto'>{status}</span>
      </div>
      {helpText && <span className={`text-label font-noto text-text-label
      ${!!width ? width : 'w-fit'}`}>{helpText}</span>}
    </div>
  );
};

export default StatusLabel;
