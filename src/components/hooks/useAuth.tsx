import { useState, useEffect, createContext, useContext } from 'react';
import { apiService } from '../../services/apiService';
import { User } from '../../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<User>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => apiService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false); // Start with false - initial user is already loaded synchronously
  const [error, setError] = useState<string | null>(null);

  // Minimal setup - auth is initialized from cache
  useEffect(() => {
    // Optional: subscribe to auth changes if needed (for multi-tab sync)
    // For now, just verify initial state is loaded
    return () => {};
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await apiService.login(email, password);
      setUser(loggedInUser);
      setError(null);
      return loggedInUser;
    } catch (err: any) {
      const errorMsg = err?.message || 'Login failed';
      setError(errorMsg);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setError(null);
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await apiService.signup(email, password, firstName, lastName);
      setUser(newUser);
      return newUser;
    } catch (err: any) {
      const errorMsg = err?.message || 'Signup failed';
      setError(errorMsg);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.forgotPassword(email);
      setError(null);
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || 'Password reset request failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.resetPassword(token, newPassword);
      setError(null);
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || 'Password reset failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, forgotPassword, resetPassword, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};