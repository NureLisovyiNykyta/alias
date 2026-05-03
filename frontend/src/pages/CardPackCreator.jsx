import TransparentInput from "@/components/TransparentInput.jsx";
import ImageInput from "@/components/ImageInput.jsx";
import StatusLabel from "@/components/StatusLabel.jsx";
import TextArea from "@/components/TextArea.jsx";
import { Button } from "@/components/Button.jsx";

const CardPackCreator = () => {
  return (
    <div className='flex flex-col w-full gap-8'>
      <div className='flex flex-col w-[492px] gap-4'>
        <h1 className='text-h1'>Create new card-pack</h1>
        <span className='text-label text-text-label font-noto'>
          Click on any cell in the grid to customize its individual properties,
          such as task type, time limits, and point values.
        </span>
      </div>

      <div className='w-full flex items-center gap-16'>
        <TransparentInput
          width='w-[310px]'
          label='Name your card pack'
          placeholder='Castles in Ukraine'
          helpText='You will be able to rename it later'
        />

        <ImageInput />

        <StatusLabel status='Draft'/>
      </div>

      <TextArea />

      <Button
        className='self-end'
      >
        Update
      </Button>
    </div>
  );
};

export default CardPackCreator;
