import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import RowNavigation from '@/components/nav/RowNavigation.jsx';
import { Button } from '@/components/buttons/Button.jsx';
import Spinner from '@/components/layouts/Spinner.jsx';
import DropDown from "@/components/inputs/DropDown.jsx";
import Input from "@/components/inputs/Input.jsx";
import NumberInput from "@/components/inputs/NumberInput.jsx";

import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useQueryClient } from '@tanstack/react-query';
import {
  useMapQuery,
  useMapFieldsQuery,
  useBulkSyncFieldsMutation,
  useActivateMapMutation,
  usePublishMapMutation
} from "@/api/maps.js";
import { usePublicPacksQuery } from "@/api/card-packs.js";
import { getCellGridStyle } from "@/utils/getCellGridStyle.js";

const DEFAULT_TIME = '60';
const DEFAULT_REWARD = '1';
const DEFAULT_PENALTY = '1';
const MAX_ROW_WIDTH = 12;

const MapFieldEditor = () => {
  const { id: mapId } = useParams();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [positions, setPositions] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);

  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME);
  const [reward, setReward] = useState(DEFAULT_REWARD);
  const [penalty, setPenalty] = useState(DEFAULT_PENALTY);

  const { data: mapData } = useMapQuery(mapId);
  const { data: serverFields, isLoading: isFieldsLoading } = useMapFieldsQuery(mapId);
  const { data: myPacks } = usePublicPacksQuery({});

  const totalFields = mapData?.max_fields_count || 0;

  const [gridFields, setGridFields] = useState([]);
  const [originalFields, setOriginalFields] = useState([]);

  const packOptions = myPacks?.items?.map(pack => ({ id: pack.id, label: pack.name })) || [];

  useEffect(() => {
    if (serverFields && totalFields > 0) {
      const newGrid = Array(totalFields).fill(null);
      serverFields.forEach(field => {
        if (field.position_index >= 0 && field.position_index < totalFields) {
          newGrid[field.position_index] = {
            id: field.id,
            card_pack_id: field.card_pack_id,
            time_limit: field.time_limit,
            award: field.award,
            penalty: field.penalty
          };
        }
      });
      setGridFields(newGrid);
      setOriginalFields(newGrid);
    }
  }, [serverFields, totalFields]);

  const { mutate: syncFields, isPending: isSaving } = useBulkSyncFieldsMutation({
    onSuccess: () => {
      setOriginalFields([...gridFields]);
      showNotification({ title: "Success", message: "Map fields have been updated.", isSuccess: true });
      queryClient.invalidateQueries(['mapFields', mapId]);
    },
    onError: () => {
      showNotification({ title: "Error", message: "Failed to save map fields.", isSuccess: false });
    }
  });

  const { mutate: activateMap, isPending: isActivating } = useActivateMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Activated", message: "Your map is now active.", isSuccess: true });
      queryClient.invalidateQueries(['map', mapId]);
    },
    onError: () => {
      showNotification({ title: "Error", message: "Failed to activate the map.", isSuccess: false });
    }
  });

  const { mutate: publishMap, isPending: isPublishing } = usePublishMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Published", message: "Your map is now public.", isSuccess: true });
      queryClient.invalidateQueries(['map', mapId]);
    },
    onError: () => {
      showNotification({ title: "Error", message: "Failed to publish the map.", isSuccess: false });
    }
  });

  const handleCellClick = (index) => {
    const cellNumber = (index + 1).toString();
    let currentPosArray = positions.split(',').map(p => p.trim()).filter(Boolean);

    if (currentPosArray.includes(cellNumber)) {
      currentPosArray = currentPosArray.filter(p => p !== cellNumber);
    } else {
      currentPosArray.push(cellNumber);
    }

    setPositions(currentPosArray.join(', '));
  };

  const handleApply = () => {
    const posArray = new Set();
    const parts = positions.split(',').map(p => p.trim()).filter(Boolean);

    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) posArray.add(i - 1);
        }
      } else {
        const num = Number(part);
        if (!isNaN(num)) posArray.add(num - 1);
      }
    });

    const validIndices = Array.from(posArray).filter(p => p >= 0 && p < totalFields);
    const newGrid = [...gridFields];

    validIndices.forEach(idx => {
      const existingField = newGrid[idx];
      newGrid[idx] = {
        id: existingField ? existingField.id : undefined,
        card_pack_id: selectedPack.id,
        time_limit: Number(timeLimit),
        award: Number(reward),
        penalty: Number(penalty)
      };
    });

    setGridFields(newGrid);

    setPositions('');
    setSelectedPack(null);
    setTimeLimit(DEFAULT_TIME);
    setReward(DEFAULT_REWARD);
    setPenalty(DEFAULT_PENALTY);
  };

  const handleSave = () => {
    const payloadFields = [];
    gridFields.forEach((field, index) => {
      if (field) {
        const fieldPayload = {
          position_index: index,
          time_limit: field.time_limit,
          award: field.award,
          penalty: field.penalty,
          card_pack_id: field.card_pack_id
        };
        if (field.id) {
          fieldPayload.id = field.id;
        }
        payloadFields.push(fieldPayload);
      }
    });
    syncFields({ mapId, fields: payloadFields });
  };

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: `${mapData?.name} Map`, path: `/map/${mapId}` },
    { id: 3, label: 'Edit Map Fields', path: null }
  ];

  const canApply = positions.trim() !== '' && selectedPack !== null && timeLimit !== '' && reward !== '' && penalty !== '';
  const hasChanges = JSON.stringify(gridFields) !== JSON.stringify(originalFields);
  const canSave = hasChanges && !isSaving && !isFieldsLoading;

  const isAllCellsFilled = totalFields > 0 && gridFields.length === totalFields && gridFields.every(field => field !== null);
  const isDraft = mapData?.status?.toUpperCase() === 'DRAFT';
  const isActivePrivate = mapData?.status?.toUpperCase() === 'ACTIVE' && !mapData?.is_public;

  const currentSelectedIndices = positions.split(',')
    .map(p => parseInt(p.trim()) - 1)
    .filter(n => !isNaN(n));

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
              placeholder='Example 1, 3, 5-7'
              helpText='Enter the position of the task'
              showArrow={false}
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
            />
            <div className='flex flex-col gap-2'>
              <DropDown
                placeholder='Choose the task'
                label='Choose the card packs'
                options={packOptions}
                value={selectedPack}
                onChange={setSelectedPack}
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
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />

            <NumberInput
              title='Pick the reward'
              placeholder='10'
              measureUnit='point'
              helpText='Number of points that player will get after solving the task'
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            />

            <NumberInput
              title='Define the penalty'
              placeholder='1'
              measureUnit='point'
              helpText='How many points player will lose for fail the task'
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              min={0}
              disableNegative={true}
            />
          </div>
        </div>

        <Button
          className='self-end'
          disabled={!canApply}
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>

      <div className='flex items-center justify-center w-full bg-surface p-4 rounded-[12px] overflow-auto'>
        {isFieldsLoading ? (
          <Spinner size="md" />
        ) : (
          <div
            className='grid gap-[2px] p-[2px] bg-surface rounded-[8px]'
            style={{
              gridTemplateColumns: `repeat(${MAX_ROW_WIDTH}, 48px)`,
              gridAutoRows: '48px',
              width: 'max-content'
            }}
          >
            {Array.from({ length: totalFields }).map((_, index) => {
              const isFilled = !!gridFields[index];
              const isSelected = currentSelectedIndices.includes(index);

              let bgClass = 'bg-white hover:bg-gray-50';
              if (isFilled) bgClass = 'bg-brand-500 hover:bg-brand-700';

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(index)}
                  style={getCellGridStyle(index, MAX_ROW_WIDTH)}
                  className={`
                    h-12 w-12 flex items-center justify-center transition-colors group relative cursor-pointer
                    ${bgClass}
                    ${isSelected ? 'ring-2 ring-brand-700 ring-inset' : ''}
                  `}
                >
                  {!isFilled && (
                    <div className='w-3 h-3 rounded-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity'/>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-3'>
          <Button
            variant='tertiary'
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? <Spinner size="sm" /> : 'Save'}
          </Button>
          <span className='text-label text-text-label font-noto'>Save the temporary result</span>
        </div>

        {isDraft && (
          <Button onClick={() => activateMap(mapId)} disabled={isActivating || !isAllCellsFilled}>
            {isActivating ? <Spinner size="sm" /> : 'Activate'}
          </Button>
        )}

        {isActivePrivate && (
          <Button onClick={() => publishMap(mapId)} disabled={isPublishing}>
            {isPublishing ? <Spinner size="sm" /> : 'Publish'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default MapFieldEditor;
