import { api } from "./axios";
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPackCards } from "@/api/card-packs.js";
import { useNotification } from "@/contexts/NotificationContext.jsx";

// --- API Calls ---

export const getMapTemplates = async () => {
  const response = await api.get('/maps/templates');
  return response.data;
};

export const createMap = async (mapData) => {
  const response = await api.post('/maps/', mapData);
  return response.data;
};

export const getMapFields = async (mapId) => {
  const response = await api.get(`/maps/${mapId}/fields`);
  return response.data;
};

export const bulkSyncFields = async ({ mapId, fields }) => {
  const response = await api.put(`/maps/${mapId}/fields`, { fields });
  return response.data;
};

export const activateMap = async (mapId) => {
  const response = await api.post(`/maps/${mapId}/activate`);
  return response.data;
};

export const publishMap = async (mapId) => {
  const response = await api.post(`/maps/${mapId}/publish`);
  return response.data;
};

export const getMapById = async (mapId) => {
  const response = await api.get(`/maps/${mapId}`);
  return response.data;
};

export const updateMap = async ({ mapId, mapData }) => {
  const response = await api.patch(`/maps/${mapId}`, mapData);
  return response.data;
};

export const getMyMaps = async (params) => {
  const response = await api.get('/maps/me', { params });
  return response.data;
};

export const getPublicMaps = async (params) => {
  const response = await api.get('/maps/public', { params });
  return response.data;
};

export const getSavedMaps = async (params) => {
  const response = await api.get('/maps/saved', { params });
  return response.data;
};

export const saveMap = async (mapId) => {
  const response = await api.post(`/maps/${mapId}/save`);
  return response.data;
};

// --- Query Hooks ---

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

export const useBulkSyncFieldsMutation = (options) => {
  return useMutation({
    mutationFn: ({ mapId, fields }) => bulkSyncFields({ mapId, fields }),
    ...options,
  });
};

export const useActivateMapMutation = (options) => {
  return useMutation({
    mutationFn: (mapId) => activateMap(mapId),
    ...options,
  });
};

export const usePublishMapMutation = (options) => {
  return useMutation({
    mutationFn: (mapId) => publishMap(mapId),
    ...options,
  });
};

export const useMapFieldsQuery = (mapId, options) => {
  return useQuery({
    queryKey: ['mapFields', mapId],
    queryFn: () => getMapFields(mapId),
    enabled: !!mapId,
    ...options,
  });
};

export const useMyMapsQuery = (params, options) => {
  return useQuery({
    queryKey: ['myMaps', params],
    queryFn: () => getMyMaps(params),
    ...options,
  });
};

export const useSaveMapMutation = (options) => {
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (mapId) => saveMap(mapId),
    onSuccess: () => {
      showNotification({
        title: "Success!",
        message: "Map has been saved to your collection.",
        isSuccess: true,
      });
    },
    ...options,
  });
};
