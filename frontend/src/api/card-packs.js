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
