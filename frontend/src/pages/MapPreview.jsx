import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDeleteMapMutation, useMapQuery } from "@/api/maps.js";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import MapPreviewCard from "@/components/cards/MapPreviewCard.jsx";
import MapPreviewBoard from "@/components/layouts/MapPreviewBoard.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import ConfirmWindow from "@/components/modals/ConfirmWindow.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { parseErrors } from "@/utils/parseErrors.js";

const MapPreview = () => {
  const { id: mapId } = useParams();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: map, isLoading } = useMapQuery(mapId);
  const { user: me } = useAuth();
  const { showNotification } = useNotification();

  const { mutate, isPending } = useDeleteMapMutation({
    onSuccess: () => {
      showNotification({
        title: "Map Deleted",
        message: `Map was deleted from the list. The existing rooms will not be affected.`,
      });
      setIsConfirmOpen(false);
      navigate('/gallery/maps');
    },
    onError: (error) => {
      showNotification({
        title: "Error occurred",
        message: `Failed to delete map data. ${parseErrors(error.response?.data)}`,
        isSuccess: false
      });
      setIsConfirmOpen(false);
    },
  });

  const links = [
    { path: "/", label: "Main Page", id: 1 },
    { label: "Review map", id: 2 },
  ];

  if (isLoading) {
    return (
      <main className="flex items-center justify-center w-full h-full gap-5">
        <Spinner size="lg"/>
        <h2 className='text-h2 text-text-label'>Loading Map Info</h2>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full gap-8 pb-10 relative">
      <RowNavigation links={links}/>

      <div className="flex flex-col w-full gap-4">
        <h1 className="text-h1">Map preview</h1>
        <span className="text-label text-text-label font-noto">
          Inspect the layers and data fields of this map. Click on any cell to view its properties.
        </span>
      </div>

      <MapPreviewCard map={map}/>
      <MapPreviewBoard mapId={mapId}/>

      {me?.id === map?.author_id &&
        <div className="flex items-center gap-2 justify-between">
          <Button
            as={Link}
            to={`/edit/map/${map.id}`}
            variant='tertiary'
          >
            Edit Map
          </Button>

          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={isPending}
          >
            Delete Map
          </Button>
        </div>
      }

      <ConfirmWindow
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Delete Map"
        label="Are you sure you want to delete this map?"
        paragraph="This action cannot be undone and will permanently remove the map from your collection."
        onSuccess={() => mutate({ mapId })}
      />
    </main>
  );
};

export default MapPreview;
