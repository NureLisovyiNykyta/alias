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
    mutationFn: async (teamData, roomCode) => {
      const response = await api.post(`/rooms/${roomCode}/teams`, teamData);
      return response.data;
    },
    ...options,
  });
};
