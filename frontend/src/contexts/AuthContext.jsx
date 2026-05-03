import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import Cookies from 'js-cookie';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!Cookies.get('refreshToken') || !!Cookies.get('authToken')
  );

  useEffect(() => {
    const checkAuth = () => {
      const hasToken = !!Cookies.get('refreshToken') || !!Cookies.get('authToken');
      setIsAuthenticated(hasToken);
    };

    const intervalId = setInterval(checkAuth, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const hasToken = !!Cookies.get('refreshToken') || !!Cookies.get('authToken');
      if (!hasToken) return null;

      const response = await api.get('/users/me');
      return response.data;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const setTokens = (accessToken, refreshToken) => {
    Cookies.set('authToken', accessToken);
    Cookies.set('refreshToken', refreshToken, { expires: 30 });
    setIsAuthenticated(true);
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  const logout = () => {
    Cookies.remove('authToken');
    Cookies.remove('refreshToken');
    setIsAuthenticated(false);
    queryClient.setQueryData(['user'], null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, setTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
