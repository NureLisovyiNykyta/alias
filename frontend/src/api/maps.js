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
