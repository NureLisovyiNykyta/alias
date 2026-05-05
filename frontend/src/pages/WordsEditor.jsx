import RowNavigation from "@/components/RowNavigation.jsx";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/Button.jsx";
import cross from '@/assets/smallCross.svg';
import WordInput from "@/components/WordInput.jsx";

const WordsEditor = () => {
  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Edit Card Pack Words', path: null }
  ];

  const { id: packId } = useParams();

  return (
    <div className='flex flex-col w-full gap-8'>
      <RowNavigation links={navLinks}/>

      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit Card Pack Words</h1>
          <Link
            to={`/edit/card-pack/${packId}`}
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the card-pack values →
          </Link>
        </div>
        <span className="text-label text-text-label font-noto w-full">
          Add the terms you want players to guess. Click the "+" or press Enter to add a new word.
        </span>
      </div>

      <div className="flex flex-col w-full rounded-[12px] border border-text-label bg-surface gap-4">
        <div className='flex flex-col w-full p-4 gap-2'>
          <h2 className='text-h2'>Card Vocabulary</h2>
          <span className="text-label text-text-label font-noto w-full">
            Add words or phrases that players will need to guess. At least 2 positions are required to save.
          </span>
        </div>

        <div className="flex items-center w-full p-4 gap-4 flex-wrap">
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className='flex items-center h-12 border border-text-label gap-8 py-[10px] px-4 rounded-[8px] bg-white'>
              <span className='text-label font-noto'>Pikachu</span>
              <button
                className='w-6 h-6 flex items-center justify-center hover:scale-115 transition-transform'
              >
                <img src={cross} alt="Remove Cross"/>
              </button>
            </div>
          ))}
        </div>

        <div className='w-full flex flex-col rounded-b-[12px] border border-text-label bg-surface-light p-4 gap-4'>
          <WordInput />
          <div className='w-full flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                variant='tertiary'
              >
                Export
              </Button>
              <span className='text-label text-text-label font-noto'>Copy the entire word list to your clipboard in one click</span>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='tertiary'
              >
                Import
              </Button>
              <span className='text-label text-text-label font-noto'>Open form to import word list</span>
            </div>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-3'>
          <Button
            variant='tertiary'
          >
            Save
          </Button>
          <span className='text-label text-text-label font-noto'>Save the temporary result</span>
        </div>

        <Button>
          Publish
        </Button>
      </div>
    </div>
  );
};

export default WordsEditor;
