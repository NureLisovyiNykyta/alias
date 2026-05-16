import { api } from "./axios";
import { useQuery, useMutation } from '@tanstack/react-query';
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

  return useMutation({
    mutationFn: (packId) => savePack(packId),
    onSuccess: () => {
      showNotification({
        title: "Success!",
        message: "Pack has been saved to your collection.",
        isSuccess: true,
      });
    },
    ...options,
  });
};

export const useCreatePackMutation = (options) => {
  return useMutation({
    mutationFn: (packData) => createPack(packData),
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
