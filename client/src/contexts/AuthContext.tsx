import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/types";
import { apiClient, LoginRequest } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: string, department?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user and validate token on mount
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await apiClient.getProfile();
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role as any,
            department: userData.department as any,
            createdAt: new Date(userData.createdAt)
          });
        } catch (error) {
          console.error('Token validation failed:', error);
          // Clear invalid tokens and reset user state
          apiClient.clearToken();
          setUser(null);
        }
      } else {
        // No token found, ensure user is logged out
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const authData = await apiClient.login({ email, password });

      setUser({
        id: authData.user.id,
        name: authData.user.name,
        email: authData.user.email,
        role: authData.user.role as any,
        department: authData.user.department as any,
        createdAt: new Date(authData.user.createdAt)
      });

      return true;
    } catch (error) {
      // Re-throw so the caller (Auth page) can read the specific backend message
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role = 'user', department?: string): Promise<boolean> => {
    try {
      setLoading(true);
      await apiClient.register({ name, email, password, role, department });
      // Account created but not logged in — user must verify email first
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear user state and tokens, even if logout request fails
      setUser(null);
      apiClient.clearToken();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
