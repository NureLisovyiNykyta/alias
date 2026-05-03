const StatusLabel = ({ status }) => {
  return (
    <div className='flex flex-col w-fit gap-[27px] self-start'>
      <h2 className='text-h2'>Status</h2>
      <span className='text-label font-noto'>{status}</span>
    </div>
  );
};

export default StatusLabel;
