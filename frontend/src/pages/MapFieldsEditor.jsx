import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import RowNavigation from '@/components/RowNavigation.jsx';
import TransparentInput from '@/components/TransparentInput.jsx';
import ImageInput from '@/components/ImageInput.jsx';
import { Button } from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import StatusLabel from "@/components/StatusLabel.jsx";
import { parseUpperCase } from "@/utils/parseUpperCase.js";
import { useMapQuery } from "@/api/maps.js";
import DropDown from "@/components/DropDown.jsx";
import Input from "@/components/Input.jsx";
import NumberInput from "@/components/NumberInput.jsx";
import cross from '@/assets/redCross.svg';

const MapFieldEditor = () => {
  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Edit Map Fields', path: null }
  ];

  const { id: mapId } = useParams();
  const { data: mapData } = useMapQuery(mapId);

  return (
    <div className="flex flex-col w-full gap-8">
      <RowNavigation links={navLinks}/>

      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit the <b>{mapData?.name}</b> map fields</h1>
          <Link
            to={`/edit/map/${mapId}`}
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the map values →
          </Link>
        </div>
        <span className="text-label text-text-label font-noto w-[492px]">
          Configure the task settings and place it on the map.
        </span>
      </div>

      <div className="flex items-start flex-col gap-4 w-full p-4 border border-surface rounded-[12px]">
        <div className='flex flex-col gap-7 w-full'>
          <div className='flex items-center gap-7'>
            <Input
              type='text'
              label='Field the position'
              placeholder='Example 1, 3, 5'
              helpText='Enter the position of the task'
              showArrow={false}
            />
            <div className='flex flex-col gap-2'>
              <DropDown
                placeholder='Choose the task'
                label='Choose the card packs'
              />
              <span className='text-label text-text-label font-noto'>The task that player has to solve</span>
            </div>
          </div>

          <div className='flex items-center justify-between gap-2 w-full'>
            <NumberInput
              title='Set the time limit'
              placeholder='50'
              measureUnit='second'
              helpText='How much time player has to solve the task'
            />

            <NumberInput
              title='Pick the reward'
              placeholder='1'
              measureUnit='point'
              helpText='Number of points that player will get after solving the task'
            />

            <NumberInput
              title='Define the penalty'
              placeholder='-1'
              measureUnit='point'
              helpText='How many points player will lose for fail the task'
            />
          </div>
        </div>

        <Button
          className='self-end'
        >
          Apply
        </Button>
      </div>

      <div className='flex items-center justify-center w-full h-100 bg-surface p-4 rounded-[12px]'>
        <div className='grid grid-cols-10 grid-rows-4'>
          {Array.from({ length: 40 }).map((_, index) => (
            <div
              key={index}
              className='h-12 w-12 border border-surface flex items-center justify-center bg-white transition-colors'
            >
              {/* Hover */}
              <div className='w-3 h-3 rounded-full bg-brand-500'/>

              {/* Not A Cell */}
              <img src={cross} alt="Not A Cell"/>

            </div>
          ))}

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

export default MapFieldEditor;
