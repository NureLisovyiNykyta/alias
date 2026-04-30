import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/api/axios';
import Cookies from 'js-cookie';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const hasAuth = Cookies.get('authToken') || Cookies.get('refreshToken');

      if (hasAuth) {
        try {
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Session has expired', error);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { authToken, refreshToken, user: userData } = response.data;

      Cookies.set('authToken', authToken);
      Cookies.set('refreshToken', refreshToken, { expires: 30 });

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Authentication failed',
      };
    }
  };

  const logout = () => {
    Cookies.remove('authToken');
    Cookies.remove('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
