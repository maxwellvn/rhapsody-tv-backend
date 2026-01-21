import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AdminUser } from '@/types/api.types';
import { storage } from '@/utils/storage.service';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AdminUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      setIsLoading(true);
      const [token, userData] = [
        storage.getAccessToken(),
        storage.getUserData<AdminUser>(),
      ];

      if (token && userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: AdminUser, accessToken: string, refreshToken: string) => {
    // Save tokens
    storage.saveTokens(accessToken, refreshToken);

    // Save user data
    storage.saveUserData(userData);

    // Update state
    setUser(userData);
  };

  const logout = () => {
    // Clear tokens and user data
    storage.clearTokens();
    storage.clearUserData();

    // Update state
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
