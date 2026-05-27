import { api } from "./axios";
import { useMutation } from '@tanstack/react-query';

export const useCreateRoomMutation = (options) => {
  return useMutation({
    mutationFn: async (roomData) => {
      const response = await api.post('/rooms/create', roomData);
      return response.data;
    },
    ...options,
  });
};

export const useCreateTeamMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, teamData }) => {
      const response = await api.post(`/rooms/${roomCode}/teams`, teamData);
      return response.data;
    },
    ...options,
  });
};

export const useCloseRoomMutation = (options) => {
  return useMutation({
    mutationFn: async (roomCode) => {
      const response = await api.post(`/rooms/${roomCode}/close`);
      return response.data;
    },
    ...options,
  });
};

export const useDeleteTeamMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, teamId }) => {
      const response = await api.delete(`/rooms/${roomCode}/teams/${teamId}`);
      return response.data;
    },
    ...options,
  });
};
