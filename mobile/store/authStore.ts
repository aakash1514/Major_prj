import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api';

interface User {
  id: string;
  username: string;
  role: string;
  name?: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post('/users/login', { email, password });
      
      // Persist to SecureStore
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch (error) {
      console.error('Error clearing SecureStore:', error);
    }
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/users/register', userData);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Rehydrate auth state from SecureStore on app start
   * Call this in the root layout's useEffect
   */
  rehydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userJson = await SecureStore.getItemAsync('user');

      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error rehydrating auth state:', error);
      // Clear invalid data
      try {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
      } catch (e) {
        console.error('Error clearing invalid SecureStore data:', e);
      }
    }
  },
}));
