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

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

export const loginUser = async (credentials) => {
  const params = new URLSearchParams();
  params.append('username', credentials.email);
  params.append('password', credentials.password);

  const response = await api.post('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const googleLogin = async (google_token) => {
  const response = await api.post('/auth/google/login', { google_token });
  return response.data;
};

export const googleRegister = async (data) => {
  const response = await api.post('/auth/google/register', data);
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

export const useLoginMutation = (options) => {
  return useMutation({
    mutationFn: (credentials) => loginUser(credentials),
    ...options,
  });
};

export const useGoogleLoginMutation = (options) => {
  return useMutation({
    mutationFn: (token) => googleLogin(token),
    ...options,
  });
};

export const useGoogleRegisterMutation = (options) => {
  return useMutation({
    mutationFn: (data) => googleRegister(data),
    ...options,
  });
};

export const useForgotPasswordMutation = (options) => {
  return useMutation({
    mutationFn: (email) => forgotPassword(email),
    ...options,
  });
};

export const useResetPasswordMutation = (options) => {
  return useMutation({
    mutationFn: (data) => resetPassword(data),
    ...options,
  });
};