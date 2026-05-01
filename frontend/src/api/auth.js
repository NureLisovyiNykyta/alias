import { api } from './axios';
import { useMutation } from '@tanstack/react-query';

export const checkEmail = async (email) => {
  const response = await api.post('/auth/check-email', { email });
  return response.data;
};

export const checkUsername = async (username) => {
  const response = await api.post('/auth/check-username', { username });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const verifyEmail = async (data) => {
  const response = await api.post('/auth/verify-email', data);
  return response.data;
};

export const useCheckUsernameMutation = (options) => {
  return useMutation({
    mutationFn: (username) => checkUsername(username),
    ...options,
  });
};

export const useRegisterMutation = (options) => {
  return useMutation({
    mutationFn: (userData) => registerUser(userData),
    ...options,
  });
};

export const useVerifyEmailMutation = (options) => {
  return useMutation({
    mutationFn: (data) => verifyEmail(data),
    ...options,
  });
};
