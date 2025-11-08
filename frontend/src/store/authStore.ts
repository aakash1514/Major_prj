import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  logout: () => void;
  register: (data: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post('/users/login', { email, password });
          localStorage.setItem('token', data.token); // Optional, since we're storing via persist
          set({ 
            user: data.user, 
            token: data.token, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed', 
            isLoading: false 
          });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/users/register', userData);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Registration failed', 
            isLoading: false 
          });
        }
      },
    }),
    {
      name: 'auth-storage', // key in localStorage
      getStorage: () => localStorage, // optional, defaults to localStorage
    }
  )
);
