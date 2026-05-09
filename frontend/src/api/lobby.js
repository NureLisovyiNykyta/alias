import { api } from "./axios";
import { useMutation } from '@tanstack/react-query';

export const createRoom = async (roomData) => {
  console.log(roomData);
  // const response = await api.post('/rooms/create', roomData);
  // return response.data;
};

export const useCreateRoomMutation = (options) => {
  return useMutation({
    mutationFn: (roomData) => createRoom(roomData),
    ...options,
  });
};
