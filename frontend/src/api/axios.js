import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {

      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/google/login') || originalRequest.url.includes('/auth/google/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refreshToken');

      if (!refreshToken) {
        processQueue(new Error('No refresh token'), null);
        Cookies.remove('authToken');
        window.location.href = '/auth/sign-in';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const newAuthToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token || refreshToken;

        Cookies.set('authToken', newAuthToken);
        Cookies.set('refreshToken', newRefreshToken, { expires: 30 });

        originalRequest.headers.Authorization = `Bearer ${newAuthToken}`;
        processQueue(null, newAuthToken);

        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove('authToken');
        Cookies.remove('refreshToken');
        window.location.href = '/auth/sign-in';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
