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

export const useJoinRoomMutation = (options) => {
  return useMutation({
    mutationFn: async (joinData) => {
      const response = await api.post('/rooms/join', joinData);
      return response.data;
    },
    ...options,
  });
};

export const useJoinTeamMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, teamId, guestId }) => {
      const body = guestId ? { guest_id: guestId } : {};
      const response = await api.post(`/rooms/${roomCode}/teams/${teamId}/join`, body);
      return response.data;
    },
    ...options,
  });
};

export const useKickPlayerMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, teamId, playerId }) => {
      const response = await api.delete(`/rooms/${roomCode}/teams/${teamId}/players/${playerId}`);
      return response.data;
    },
    ...options,
  });
};

export const useLeaveTeamMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, teamId, playerId }) => {
      const response = await api.post(`/rooms/${roomCode}/teams/${teamId}/leave`, { guest_id: playerId });
      return response.data;
    },
    ...options,
  });
};

export const useLeaveRoomMutation = (options) => {
  return useMutation({
    mutationFn: async ({ roomCode, playerId }) => {
      const response = await api.post(`/rooms/${roomCode}/leave`, { guest_id: playerId });
      return response.data;
    },
    ...options,
  });
};
