import { api } from "./axios";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNotification } from "@/contexts/NotificationContext.jsx";

// API Calls ------------------
export const getPublicPacks = async (params) => {
  const response = await api.get('/card-packs/public', { params });
  return response.data;
};

export const getSavedPacks = async (params) => {
  const response = await api.get('/card-packs/saved', { params });
  return response.data;
};

export const getMyPacks = async (params) => {
  const response = await api.get('/card-packs/me', { params });
  return response.data;
};

export const savePack = async (packId) => {
  const response = await api.post(`/card-packs/${packId}/save`);
  return response.data;
};

export const createPack = async (packData) => {
  const response = await api.post('/card-packs/', packData);
  return response.data;
};

export const getPackTypes = async () => {
  const response = await api.get('/card-packs/types');
  return response.data;
};

export const getPackById = async (packId) => {
  const response = await api.get(`/card-packs/${packId}`);
  return response.data;
};

export const updatePack = async ({ packId, packData }) => {
  const response = await api.patch(`/card-packs/${packId}`, packData);
  return response.data;
};

export const getPackCards = async (packId) => {
  const response = await api.get(`/card-packs/${packId}/cards`);
  return response.data;
};

export const bulkSyncCards = async ({ packId, cards }) => {
  const response = await api.put(`/card-packs/${packId}/cards`, { cards });
  return response.data;
};

export const activatePack = async (packId) => {
  const response = await api.post(`/card-packs/${packId}/activate`);
  return response.data;
};

export const publishPack = async (packId) => {
  const response = await api.post(`/card-packs/${packId}/publish`);
  return response.data;
};

export const uploadPackCover = async ({ packId, file }) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/card-packs/${packId}/cover`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deletePackCover = async (packId) => {
  const response = await api.delete(`/card-packs/${packId}/cover`);
  return response.data;
};

export const searchPacks = async (params, signal) => {
  const response = await api.get('/card-packs/search', { params, signal });
  return response.data;
};

// Query Hooks ------------------

export const usePublicPacksQuery = (params, options) => {
  return useQuery({
    queryKey: ['publicPacks', params],
    queryFn: () => getPublicPacks(params),
    ...options,
  });
};

export const useSavedPacksQuery = (params, options) => {
  return useQuery({
    queryKey: ['savedPacks', params],
    queryFn: () => getSavedPacks(params),
    ...options,
  });
};

export const useMyPacksQuery = (params, options) => {
  return useQuery({
    queryKey: ['myPacks', params],
    queryFn: () => getMyPacks(params),
    ...options,
  });
};

export const useSavePackMutation = (options) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packId) => savePack(packId),
    onSuccess: (data) => {
      showNotification({
        title: "Success!",
        message: `Pack has been ${data.response?.data.saved ? 'saved to' : 'removed from'} your collection.`,
        isSuccess: true,
      });

      queryClient.invalidateQueries({ queryKey: ['publicPacks'] });
      queryClient.invalidateQueries({ queryKey: ['savedPacks'] });
    },
    ...options,
  });
};

export const useCreatePackMutation = (options) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packData) => createPack(packData),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['myPacks'] });

      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options,
  });
};

export const usePackTypesQuery = (options) => {
  return useQuery({
    queryKey: ['packTypes'],
    queryFn: getPackTypes,
    ...options,
  });
};

export const usePackQuery = (packId, options) => {
  return useQuery({
    queryKey: ['pack', packId],
    queryFn: () => getPackById(packId),
    enabled: !!packId,
    ...options,
  });
};

export const useUpdatePackMutation = (options) => {
  return useMutation({
    mutationFn: ({ packId, packData }) => updatePack({ packId, packData }),
    ...options,
  });
};

export const usePackCardsQuery = (packId, options) => {
  return useQuery({
    queryKey: ['packCards', packId],
    queryFn: () => getPackCards(packId),
    enabled: !!packId,
    ...options,
  });
};

export const useBulkSyncCardsMutation = (options) => {
  return useMutation({
    mutationFn: ({ packId, cards }) => bulkSyncCards({ packId, cards }),
    ...options,
  });
};

export const useActivatePackMutation = (options) => {
  return useMutation({
    mutationFn: (packId) => activatePack(packId),
    ...options,
  });
};

export const usePublishPackMutation = (options) => {
  return useMutation({
    mutationFn: (packId) => publishPack(packId),
    ...options,
  });
};

export const useUploadPackCoverMutation = (options) => {
  return useMutation({
    mutationFn: ({ packId, file }) => uploadPackCover({ packId, file }),
    ...options,
  });
};

export const useDeletePackCoverMutation = (options) => {
  return useMutation({
    mutationFn: (packId) => deletePackCover(packId),
    ...options,
  });
};

export const useSearchPacksQuery = (params, options) => {
  return useQuery({
    queryKey: ['searchPacks', params],
    queryFn: ({ signal }) => searchPacks(params, signal),
    placeholderData: (previousData) => previousData,
    ...options,
  });
};

export const useSearchPacksInfiniteQuery = (params, options) => {
  return useInfiniteQuery({
    queryKey: ['searchPacksInfinite', params],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0, signal }) =>
      searchPacks({ ...params, offset: pageParam }, signal),
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * (params.limit || 10);
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    ...options,
  });
};

export const useDeletePackQuery = (options) => {
  const queryClient = useQueryClient();

  return useMutation({
    queryKey: ['pack', options],
    mutationFn: async ({ packId }) => {
      const response = await api.delete(`/card-packs/${packId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPacks'] });
    },
    ...options,
  });
}
