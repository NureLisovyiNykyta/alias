import { api } from "./axios";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getPackCards } from "@/api/card-packs.js";
import { useNotification } from "@/contexts/NotificationContext.jsx";

// --- API Calls ---

export const getMapThemes = async () => {
  const response = await api.get('/maps/themes');
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

export const uploadMapCover = async ({ mapId, file }) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/maps/${mapId}/cover`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteMapCover = async (mapId) => {
  const response = await api.delete(`/maps/${mapId}/cover`);
  return response.data;
};

export const searchMaps = async (params, signal) => {
  const response = await api.get('/maps/search', { params, signal });
  return response.data;
};

// --- Query Hooks ---

export const useMapThemesQuery = (options) => {
  return useQuery({
    queryKey: ['mapThemes'],
    queryFn: getMapThemes,
    ...options,
  });
};

export const useCreateMapMutation = (options) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapData) => createMap(mapData),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['myMaps'] });

      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapId) => saveMap(mapId),
    onSuccess: (data) => {
      showNotification({
        title: "Success!",
        message: `Map has been saved ${data.response?.data.saved ? 'saved to' : 'removed from'} collection.`,
        isSuccess: true,
      });

      queryClient.invalidateQueries({ queryKey: ['publicMaps'] });
      queryClient.invalidateQueries({ queryKey: ['savedMaps'] });
    },
    ...options,
  });
};

export const useUploadMapCoverMutation = (options) => {
  return useMutation({
    mutationFn: ({ mapId, file }) => uploadMapCover({ mapId, file }),
    ...options,
  });
};

export const useDeleteMapCoverMutation = (options) => {
  return useMutation({
    mutationFn: (mapId) => deleteMapCover(mapId),
    ...options,
  });
};

export const useMapSizesQuery = () => {
  return useQuery({
    queryKey: ['map-sizes'],
    queryFn: async () => {
      const response = await api.get('/maps/sizes');
      return response.data;
    }
  });
};

export const useSearchMapsInfiniteQuery = (params, options) => {
  return useInfiniteQuery({
    queryKey: ['searchMapsInfinite', params],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0, signal }) =>
      searchMaps({ ...params, offset: pageParam }, signal),
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * (params.limit || 10);
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    ...options,
  });
};

export const useDeleteMapQuery = (options) => {
  const queryClient = useQueryClient();

  return useMutation({
    queryKey: ['map', options],
    mutationFn: async ({ mapId }) => {
      console.log(mapId)
      const response = await api.delete(`/maps/${mapId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMaps'] });
    },
    ...options,
  });
}
