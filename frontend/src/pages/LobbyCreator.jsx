import React from "react";
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
import { useMyMapsQuery } from "@/api/maps.js";
import mapPreviewIcon from "@/assets/mapPreview.svg";

const createLobbySchema = z.object({
  room_name: z.string().min(1, "Name is required"),
  map: z.any().refine((val) => val !== null && val !== undefined, "Map is required"),
});

const LobbyCreator = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

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
    }
  });

  const [currentName, currentMap] = useWatch({
    control,
    name: ["room_name", "map"],
  });

  const { data: rawMaps, isLoading: isMapsLoading } = useMyMapsQuery();

  const mapOptions = Array.isArray(rawMaps)
    ? rawMaps.map(map => ({ ...map, label: map.name }))
    : rawMaps?.items?.map(map => ({ ...map, label: map.name })) || [];

  const { mutate: createLobby, isPending } = useCreateRoomMutation({
    onSuccess: () => {
      showNotification({
        title: "Lobby Created!",
        message: "Your lobby has been successfully created. Redirecting.",
        isSuccess: true,
      });

      setTimeout(() => {
        navigate('/lobby');
      }, 2000);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to create the lobby.",
        isSuccess: false,
      });
    },
  });

  const isNameValid = !!currentName && currentName.trim().length > 0 && !errors.room_name;
  const isMapValid = !!currentMap && !errors.map;
  const isFormValid = isNameValid && isMapValid;

  const onSubmit = (data) => {
    if (!isFormValid) return;

    createLobby({
      room_name: data.room_name,
      map_id: data.map.id
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
            {isMapsLoading ? (
              <div className="flex items-center gap-2 text-text-label">
                <Spinner size="sm"/>
                <span className="font-noto text-sm">Loading maps...</span>
              </div>
            ) : (
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
                  />
                )}
              />
            )}
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
