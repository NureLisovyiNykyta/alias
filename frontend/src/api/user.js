import { api } from "./axios";
import { useQuery } from "@tanstack/react-query";

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