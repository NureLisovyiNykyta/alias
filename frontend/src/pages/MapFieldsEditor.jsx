import React, { useState, useEffect, useMemo } from 'react';
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
import { useSearchPacksInfiniteQuery } from "@/api/card-packs.js";
import { getCellGridStyle } from "@/utils/getCellGridStyle.js";
import { parseErrors } from "@/utils/parseErrors.js";

const DEFAULT_TIME = '60';
const DEFAULT_REWARD = '1';
const DEFAULT_PENALTY = '1';
const MAX_ROW_WIDTH = 12;

const SCOPE_OPTIONS = [
  { id: 'available', label: 'All' },
  { id: 'public', label: 'Public' },
  { id: 'saved', label: 'Saved' },
  { id: 'my', label: 'My' },
];

const MapFieldEditor = () => {
  const { id: mapId } = useParams();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [positions, setPositions] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME);
  const [reward, setReward] = useState(DEFAULT_REWARD);
  const [penalty, setPenalty] = useState(DEFAULT_PENALTY);

  const { data: mapData } = useMapQuery(mapId);
  const { data: serverFields, isLoading: isFieldsLoading } = useMapFieldsQuery(mapId);

  const totalFields = mapData?.max_fields_count || 0;

  const [gridFields, setGridFields] = useState([]);
  const [originalFields, setOriginalFields] = useState([]);

  useEffect(() => {
    if (serverFields && totalFields > 0) {
      const newGrid = Array(totalFields).fill(null);
      serverFields.forEach(field => {
        if (field.position_index >= 0 && field.position_index < totalFields) {
          newGrid[field.position_index] = {
            id: field.id,
            card_pack_id: field.card_pack_id,
            card_pack: field.card_pack,
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

  const currentSelectedIndices = useMemo(() => {
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
    return Array.from(posArray).filter(p => p >= 0 && p < totalFields);
  }, [positions, totalFields]);

  useEffect(() => {
    if (!serverFields) return;

    const selectedFilledFields = currentSelectedIndices
      .map(idx => gridFields[idx])
      .filter(Boolean);

    if (selectedFilledFields.length === 0) {
      setTimeLimit(DEFAULT_TIME);
      setReward(DEFAULT_REWARD);
      setPenalty(DEFAULT_PENALTY);
      setSelectedPack(null);
      return;
    }

    const first = selectedFilledFields[0];
    const isUniformTime = selectedFilledFields.every(f => f.time_limit === first.time_limit);
    const isUniformAward = selectedFilledFields.every(f => f.award === first.award);
    const isUniformPenalty = selectedFilledFields.every(f => f.penalty === first.penalty);
    const isUniformPack = selectedFilledFields.every(f => f.card_pack_id === first.card_pack_id);

    setTimeLimit(isUniformTime ? first.time_limit.toString() : DEFAULT_TIME);
    setReward(isUniformAward ? first.award.toString() : DEFAULT_REWARD);
    setPenalty(isUniformPenalty ? first.penalty.toString() : DEFAULT_PENALTY);

    if (isUniformPack && first.card_pack) {
      setSelectedPack({
        id: first.card_pack.id,
        label: first.card_pack.name,
        image: first.card_pack.cover_url || null
      });
    } else {
      setSelectedPack(null);
    }
  }, [currentSelectedIndices, gridFields, serverFields]);


  const [searchScope, setSearchScope] = useState(SCOPE_OPTIONS[0].id);
  const minChars = ['my', 'saved'].includes(searchScope) ? 1 : 2;

  const isSearchActive = debouncedSearch.trim().length >= minChars;
  const isTypingShort = debouncedSearch.trim().length > 0 && !isSearchActive;

  const searchParams = isSearchActive
    ? { q: debouncedSearch.trim(), scope: searchScope, limit: 10 }
    : { scope: searchScope, limit: 10, sort_by: searchScope === SCOPE_OPTIONS[3].id ? 'newest' : 'most_saved' };

  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSearchPacksInfiniteQuery(searchParams, {
    enabled: !isTypingShort,
    staleTime: 1000 * 60 * 5,
  });

  const packOptions = searchResults?.pages
    .flatMap(page => page.items)
    .map(pack => ({ id: pack.id, label: pack.name, image: pack.cover_url })) || [];

  const { mutate: syncFields, mutateAsync: syncFieldsAsync, isPending: isSaving } = useBulkSyncFieldsMutation({
    onSuccess: () => {
      setOriginalFields([...gridFields]);
      showNotification({ title: "Success", message: "Map fields have been updated.", isSuccess: true });
      queryClient.invalidateQueries(['mapFields', mapId]);
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to save map fields. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const { mutate: activateMap, isPending: isActivating } = useActivateMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Activated", message: "Your map is now active.", isSuccess: true });
      queryClient.invalidateQueries(['map', mapId]);
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to activate the map. ${parseErrors(error.response?.data)}`, isSuccess: false });
    }
  });

  const { mutate: publishMap, isPending: isPublishing } = usePublishMapMutation({
    onSuccess: () => {
      showNotification({ title: "Map Published", message: "Your map is now public.", isSuccess: true });
      queryClient.invalidateQueries(['map', mapId]);
    },
    onError: (error) => {
      showNotification({ title: "Error", message: `Failed to publish the map. ${parseErrors(error.response?.data)}`, isSuccess: false });
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
    const validIndices = currentSelectedIndices;
    const newGrid = [...gridFields];

    validIndices.forEach(idx => {
      const existingField = newGrid[idx];
      newGrid[idx] = {
        id: existingField ? existingField.id : undefined,
        card_pack_id: selectedPack.id,
        card_pack: { id: selectedPack.id, name: selectedPack.label },
        time_limit: Number(timeLimit),
        award: Number(reward),
        penalty: Number(penalty)
      };
    });

    setGridFields(newGrid);

    setPositions('');
  };

  const getFieldsPayload = () => {
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
    return payloadFields;
  };

  const handleSave = () => {
    syncFields({ mapId, fields: getFieldsPayload() });
  };

  const handleActivateClick = async () => {
    if (hasChanges) {
      try {
        await syncFieldsAsync({ mapId, fields: getFieldsPayload() });
      } catch (error) {
        return;
      }
    }
    activateMap(mapId);
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
                withSearch={true}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                isLoading={isSearching}
                scopeOptions={SCOPE_OPTIONS}
                activeScope={searchScope}
                onScopeChange={setSearchScope}
                onLoadMore={() => fetchNextPage()}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
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
          <Button
            onClick={handleActivateClick}
            disabled={isActivating || isSaving || !isAllCellsFilled}
          >
            {(isActivating || (hasChanges && isSaving))
              ? <Spinner size="sm" />
              : (hasChanges ? 'Save and Activate' : 'Activate')
            }
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
