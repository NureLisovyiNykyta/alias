import { api } from "./axios";
import { useQuery, useMutation } from '@tanstack/react-query';

// --- API Calls ---

export const getMapTemplates = async () => {
  const response = await api.get('/maps/templates');
  return response.data;
};

export const createMap = async (mapData) => {
  const response = await api.post('/maps/', mapData);
  return response.data;
};

// --- Query Hooks ---

export const getMapById = async (mapId) => {
  const response = await api.get(`/maps/${mapId}`);
  return response.data;
};

export const updateMap = async ({ mapId, mapData }) => {
  const response = await api.patch(`/maps/${mapId}`, mapData);
  return response.data;
};

export const useMapTemplatesQuery = (options) => {
  return useQuery({
    queryKey: ['mapTemplates'],
    queryFn: getMapTemplates,
    ...options,
  });
};

export const useCreateMapMutation = (options) => {
  return useMutation({
    mutationFn: (mapData) => createMap(mapData),
    ...options,
  });
};

export const useMapQuery = (mapId, options) => {
  return useQuery({
    queryKey: ['map', mapId],
    queryFn: () => getMapById(mapId),
    enabled: !!mapId,
    ...options,
  });
};

export const useUpdateMapMutation = (options) => {
  return useMutation({
    mutationFn: ({ mapId, mapData }) => updateMap({ mapId, mapData }),
    ...options,
  });
};