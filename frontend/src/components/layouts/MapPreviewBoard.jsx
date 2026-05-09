import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMapFieldsQuery, useMapQuery } from "@/api/maps.js";
import Spinner from "@/components/layouts/Spinner.jsx";
import { getCellGridStyle } from "@/utils/getCellGridStyle.js";

const MAX_ROW_WIDTH = 12;

const MapPreviewBoard = ({ mapId }) => {
  const { data: serverFields, isLoading: isFieldsLoading } = useMapFieldsQuery(mapId);
  const { data: mapData, isLoading: isMapLoading } = useMapQuery(mapId);
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (isFieldsLoading || isMapLoading) {
    return (
      <div className="flex items-center justify-center w-full h-[300px] bg-surface rounded-[12px]">
        <Spinner size="md"/>
      </div>
    );
  }

  const totalFields = mapData?.template?.max_fields_count || 0;
  const gridFields = Array(totalFields).fill(null);

  if (serverFields && totalFields > 0) {
    serverFields.forEach(field => {
      if (field.position_index >= 0 && field.position_index < totalFields) {
        gridFields[field.position_index] = field;
      }
    });
  }

  const selectedField = selectedIndex !== null ? gridFields[selectedIndex] : null;

  return (
    <div className="flex gap-8 p-8 items-start rounded-[12px] w-full bg-surface relative">
      <div
        className="grid gap-[2px] p-[2px] h-max shrink-0"
        style={{
          gridTemplateColumns: `repeat(${MAX_ROW_WIDTH}, 48px)`,
          gridAutoRows: '48px',
          width: 'max-content'
        }}
      >
        {Array.from({ length: totalFields }).map((_, index) => {
          const isFilled = !!gridFields[index];
          const isSelected = selectedIndex === index;

          let bgClass = 'bg-white';
          if (isFilled) bgClass = 'bg-brand-500 hover:bg-brand-600 transition-colors';

          return (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              style={getCellGridStyle(index, MAX_ROW_WIDTH)}
              className={`
                h-12 w-12 flex items-center justify-center cursor-pointer transition-all
                ${bgClass}
                ${isSelected ? 'ring-2 ring-brand-700 ring-inset shadow-md scale-105 z-10' : ''}
              `}
            >
              {isSelected && !isFilled && (
                <span className="text-brand-500 font-bold text-xl">✕</span>
              )}
              {isSelected && isFilled && (
                <div className="w-2 h-2 rounded-full bg-white"/>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky top-12 bg-white rounded-[12px] py-9 px-8 flex flex-col justify-center gap-6 shadow-sm h-[344px] w-[498px] shrink-0">
        {selectedIndex === null ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-h1">No field selected</h3>
            <p className="font-noto text-p text-text-label">
              Select any cell on the card to inspect its properties, data source, and constraints.
            </p>
          </div>
        ) : !selectedField ? (
          <div className="flex flex-col gap-6">
            <h3 className="text-h1">Field Details</h3>
            <div className="flex flex-col gap-2">
              <span className="font-noto font-bold text-p">Status:</span>
              <p className="font-noto text-p text-text-label">
                No data has been assigned to this field in the current template.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-noto font-bold text-p">Value:</span>
              <p className="font-noto text-p text-text-label">None</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h3 className="text-h1">Field Details</h3>

            <p className="font-noto text-p">
              This field contains data from the{' '}
              <Link
                to={`/card-pack/${selectedField.card_pack_id}`}
                className="text-label font-noto text-brand-500 hover:text-brand-700"
              >
                Pack collection →
              </Link>
            </p>

            <p className="font-noto">{selectedField?.card_pack?.description}</p>

            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-3">
                <span className="font-noto font-bold text-label">Time limit</span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center min-w-[48px] px-3 h-10 border border-surface rounded-[8px] font-noto text-p bg-white shadow-sm">
                    {selectedField.time_limit}
                  </span>
                  <span className="text-label text-text-label font-noto">second{selectedField.time_limit !== 1 && 's'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="font-noto font-bold text-label">The reward</span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center min-w-[48px] px-3 h-10 border border-surface rounded-[8px] font-noto text-p bg-white shadow-sm">
                    {selectedField.award}
                  </span>
                  <span className="text-label text-text-label font-noto">point{selectedField.award !== 1 && 's'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="font-noto font-bold text-label">The penalty</span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center min-w-[48px] px-3 h-10 border border-surface rounded-[8px] font-noto text-p bg-white shadow-sm">
                    {selectedField.penalty}
                  </span>
                  <span className="text-label text-text-label font-noto">point{selectedField.penalty !== 1 && 's'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPreviewBoard;
