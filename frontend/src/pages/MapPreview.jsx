import { useParams } from "react-router-dom";
import { useMapQuery } from "@/api/maps.js";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import MapCard from "@/components/cards/MapCard.jsx";
import MapPreviewBoard from "@/components/layouts/MapPreviewBoard.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";

const MapPreview = () => {
  const { id: mapId } = useParams();
  const { data: map, isLoading } = useMapQuery(mapId);

  const links = [
    { path: "/", label: "Main Page", id: 1 },
    { label: "Review map", id: 2 },
  ];

  if (isLoading) {
    return (
      <main className="flex items-center justify-center w-full h-full gap-5">
        <Spinner size="lg" />
        <h2 className='text-h2 text-text-label'>Loading Map Info</h2>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full gap-8 pb-10">
      <RowNavigation links={links}/>

      <div className="flex flex-col w-full gap-4">
        <h1 className="text-h1">Map preview</h1>
        <span className="text-label text-text-label font-noto">
          Inspect the layers and data fields of this map. Click on any cell to view its properties.
        </span>
      </div>

      <MapCard map={map} />

      <MapPreviewBoard mapId={mapId} />
    </main>
  );
};

export default MapPreview;
