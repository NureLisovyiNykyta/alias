import { api } from "./axios";
import { useQuery, useMutation } from "@tanstack/react-query";

export const getUserByUsername = async (username) => {
  const response = await api.get(`/users/${username}`);
  return response.data;
};

export const useUserByUsernameQuery = (username, options) => {
  return useQuery({
    queryKey: ['user', username],
    queryFn: () => getUserByUsername(username),
    enabled: !!username,
    ...options,
  });
};

export const useUpdateMeMutation = (options) => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.patch('/users/me', data);
      return response.data;
    },
    ...options,
  });
};

export const useChangePasswordMutation = (options) => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/users/me/password', data);
      return response.data;
    },
    ...options,
  });
};

export const useDeleteMeMutation = (options) => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/users/me');
      return response.data;
    },
    ...options,
  });
};
