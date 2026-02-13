import { useState, useEffect, createContext, useContext } from 'react';
import { apiService } from '../../services/apiService';
import { User } from '../../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => apiService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize auth state
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const loggedInUser = await apiService.login(email, password);
      setUser(loggedInUser);
      setError(null);
      return loggedInUser;
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};