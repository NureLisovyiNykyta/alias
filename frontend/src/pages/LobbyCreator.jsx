import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import TransparentInput from "@/components/inputs/TransparentInput.jsx";
import DropDown from "@/components/inputs/DropDown.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import Spinner from '@/components/layouts/Spinner.jsx';
import dots from '@/assets/tripleDot.svg';
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useCreateRoomMutation } from "@/api/lobby";
import { useMapThemesQuery, useSearchMapsInfiniteQuery } from "@/api/maps.js";
import mapPreviewIcon from "@/assets/mapPreview.svg";
import MapThemeSelector from "@/components/inputs/MapThemeSelector.jsx";
import { useLobby } from "@/contexts/LobbyContext.jsx";
import { parseErrors } from "@/utils/parseErrors.js";

const createLobbySchema = z.object({
  room_name: z.string().min(1, "Name is required"),
  map: z.any().refine((val) => val !== null && val !== undefined, "Map is required"),
  theme: z.any().refine((val) => val !== null && val !== undefined, "Theme is required"),
});

const SCOPE_OPTIONS = [
  { id: 'available', label: 'All' },
  { id: 'public', label: 'Public' },
  { id: 'saved', label: 'Saved' },
  { id: 'my', label: 'My' },
];

const SIZE_OPTIONS = [
  { id: 'ALL', label: 'All' },
  { id: 'SMALL', label: 'Small' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'LARGE', label: 'Large' },
];

const LobbyCreator = () => {
  const navigate = useNavigate();
  const { showNotification, closeNotification } = useNotification();
  const { setRoom } = useLobby();

  const links = [
    { id: 1, label: "Main Page", path: "/" },
    { id: 2, label: "Create Lobby", path: null },
  ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createLobbySchema),
    mode: "onChange",
    defaultValues: {
      room_name: '',
      map: null,
      theme: null,
    }
  });

  const [currentName, currentMap, currentTheme] = useWatch({
    control,
    name: ["room_name", "map", "theme"],
  });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchScope, setSearchScope] = useState(SCOPE_OPTIONS[0].id);
  const [searchSize, setSearchSize] = useState(SIZE_OPTIONS[0].id);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const minChars = ['my', 'saved'].includes(searchScope) ? 1 : 2;

  const isSearchActive = debouncedSearch.trim().length >= minChars;
  const isTypingShort = debouncedSearch.trim().length > 0 && !isSearchActive;

  const searchParams = {
    limit: 10,
    scope: searchScope,
    ...(isSearchActive ? { q: debouncedSearch.trim() } : { sort_by: searchScope === 'my' ? 'newest' : 'most_saved' }),
    ...(searchSize !== 'ALL' ? { size: searchSize } : {}),
  };

  const {
    data: searchResults,
    isLoading: isMapsSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSearchMapsInfiniteQuery(searchParams, {
    enabled: !isTypingShort,
    staleTime: 1000 * 60 * 5,
  });

  const mapOptions = searchResults?.pages
    .flatMap(page => page.items)
    .filter(map => map.status === 'ACTIVE')
    .map(map => ({ ...map, label: map.name, image: map.cover_url })) || [];

  const { data: rawThemes, isLoading: isThemesLoading } = useMapThemesQuery();
  const themeOptions = Array.isArray(rawThemes)
    ? rawThemes.map(theme => ({ ...theme, label: theme.name }))
    : rawThemes?.items?.map(theme => ({ ...theme, label: theme.name })) || [];

  const { mutate: createLobby, isPending } = useCreateRoomMutation({
    onSuccess: (data) => {
      showNotification({
        title: "Lobby Created!",
        message: "Your lobby has been successfully created. Redirecting.",
        isSuccess: true,
      });

      setRoom(data.room_code);

      setTimeout(() => {
        navigate(`/lobby/${data.room_code}/waiting`, {
          state: { initialRoomData: data }
        });
        closeNotification();
      }, 1500);
    },
    onError: (error ) => {
      showNotification({
        title: "Error",
        message: `Failed to create the lobby. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
    },
  });

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.room_name;
  const isMapValid = !!currentMap && !errors.map;
  const isThemeValid = !!currentTheme && !errors.theme;
  const isFormValid = isNameValid && isMapValid && isThemeValid;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    createLobby({
      room_name: data.room_name,
      map_id: data.map.id,
      theme_id: data.theme.id
    });
  };

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
        {...register('room_name')}
        error={!!errors.room_name}
        isValid={isNameValid}
        helpText={errors.room_name ? errors.room_name.message : 'Enter the name of the lobby'}
        successText='Correct format'
      />

      <div className="flex flex-col w-full gap-4 pt-4">
        <h2 className='text-h2'>Select Game Map</h2>

        <div className='w-full flex items-center justify-around bg-surface rounded-[12px] p-4 gap-16'>
          <div className='flex flex-col gap-2'>
            <Controller
              control={control}
              name="map"
              render={({ field: { onChange, value } }) => (
                <DropDown
                  placeholder='Choose the Map'
                  options={mapOptions}
                  value={value}
                  onChange={onChange}
                  error={!!errors.map}
                  isValid={isMapValid}
                  withSearch={true}
                  searchValue={searchInput}
                  onSearchChange={setSearchInput}
                  isLoading={isMapsSearching}
                  scopeOptions={SCOPE_OPTIONS}
                  activeScope={searchScope}
                  onScopeChange={setSearchScope}
                  secondaryScopeOptions={SIZE_OPTIONS}
                  activeSecondaryScope={searchSize}
                  onSecondaryScopeChange={setSearchSize}
                  onLoadMore={() => fetchNextPage()}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              )}
            />
            <span className='text-label text-text-label font-noto'>
              {errors.map ? errors.map.message : 'Pick an option from the maps'}
            </span>
          </div>

          {currentMap?.id ? (
            <div className='flex items-center gap-4'>
              <img
                src={currentMap?.cover_url}
                alt={currentMap?.name || 'Map Preview'}
                className='w-[300px] h-[200px] rounded-[12px] border border-text-label object-cover bg-gray-100'
              />

              <div className='flex flex-col gap-4'>
                <h2 className='text-h2'>{currentMap ? currentMap.name : 'Map Name'}</h2>
                <Button
                  variant='tertiary'
                  as={Link}
                  to={`/map/${currentMap?.id}`}
                  disabled={!currentMap}
                >
                  <img src={dots} alt="Triple Dots"/>
                  <span>Preview The Map</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className='w-[300px] h-[200px] rounded-[12px] border border-text-label object-cover bg-gray-100 flex items-center justify-center p-4'>
              <div className="flex flex-col items-center gap-4">
                <img src={mapPreviewIcon} alt="Map Placeholder"/>
                <span className="text-label text-text-label font-noto text-center">
                  Preview will appear here after selecting a map
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isThemesLoading ? (
          <Spinner size="md" />
        ) : (
          <Controller
            name="theme"
            control={control}
            render={({ field: { onChange, value } }) => (
              <MapThemeSelector
                templates={themeOptions}
                selectedTemplate={value}
                onSelectTemplate={onChange}
              />
            )}
          />
        )}
      </div>

      <Button
        className='self-end'
        disabled={!isFormValid || isPending}
        onClick={handleSubmit(onSubmit)}
      >
        {isPending ? <Spinner size='sm'/> : 'Create New Lobby'}
      </Button>
    </main>
  );
};

export default LobbyCreator;
