import RowNavigation from "@/components/nav/RowNavigation.jsx";
import React from "react";
import TransparentInput from "@/components/inputs/TransparentInput.jsx";
import DropDown from "@/components/inputs/DropDown.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import dots from '@/assets/tripleDot.svg';
import { Link } from "react-router-dom";

const LobbyCreator = () => {
  const links = [
    { id: 1, label: "Main Page", path: "/" },
    { id: 2, label: "Create Lobby", path: null },
  ];

  return (
    <main className="flex flex-col w-full gap-8">
      <RowNavigation links={links}/>

      <div className="flex flex-col w-full gap-4">
        <h1 className="text-h1">Lobby Creation</h1>
        <span className="text-label text-text-label font-noto">
          Identify how many teams and invite your friends by invite-code or link below.
        </span>
      </div>

      <TransparentInput
        width='w-[310px]'
        label='Name The Lobby'
        placeholder='Castles in Ukraine'
        helpText='Enter the name of the lobby'
      />

      <div className="flex flex-col w-full gap-4 pb-4">
        <h2 className='text-h2'>Select Game Map</h2>

        <div className='w-full flex items-center bg-surface rounded-[12px] p-4 gap-16'>
          <div className='flex flex-col gap-2'>
            <DropDown
              placeholder='Choose the Map'
            />
            <span className='text-label text-text-label font-noto'>Pick an option from the maps</span>
          </div>

          <div className='flex items-center gap-4'>
            <img src="" alt='Map Name' className='w-[300px] h-[200px] rounded-[12px] border border-text-label object-cover'/>
            <div className='flex flex-col gap-4'>
              <h2 className='text-h2'>Map Name</h2>
              <Button
                variant='tertiary'
                as={Link}
              >
                <img src={dots} alt="Triple Dots"/>
                <span>Preview The Map</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Button
        className='self-end'
      >
        Create New Lobby
      </Button>
    </main>
  );
};

export default LobbyCreator;
