import rightArrow from '@/assets/rightArrow.svg';

const Input = ({ label = '', placeholder = '', type = 'text', id }) => {
  return (
    <div className="flex flex-col gap-2 w-[280px]">
      <label htmlFor={id} className="font-noto text-p">{label}</label>

      <div
        className="flex bg-surface items-center border border-text-label rounded-[8px] py-[10px] px-4 justify-between w-full h-[48px]">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className="bg-transparent w-full outline-none text-label font-noto text-text-label"
        />

        <button
          className="flex items-center justify-center w-8 h-6 rounded-[8px] bg-brand-500"
        >
          <img src={rightArrow} alt=""/>
        </button>
      </div>
    </div>
  );
};

export default Input;
