import { create } from 'zustand';
import { api } from '../utils/api';
import { Crop } from '../types';

interface CropsState {
  crops: Crop[];
  isLoading: boolean;
  error: string | null;
  fetchCrops: () => Promise<void>;
  fetchFarmerCrops: () => Promise<void>;
  addCrop: (data: any) => Promise<void>;
  updateCrop: (id: string, data: any) => Promise<void>;
  deleteCrop: (id: string) => Promise<void>;
}

export const useCropsStore = create<CropsState>((set) => ({
  crops: [],
  isLoading: false,
  error: null,

  fetchCrops: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/crops');
      set({ crops: response.data || response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch crops',
        isLoading: false,
      });
    }
  },

  fetchFarmerCrops: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/farmer/crops');
      set({ crops: response.data || response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch farmer crops',
        isLoading: false,
      });
    }
  },

  addCrop: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/crops', data);
      set((state) => ({
        crops: [...state.crops, response.data || response],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add crop',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCrop: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/crops/${id}`, data);
      set((state) => ({
        crops: state.crops.map((crop) =>
          crop.id === id ? { ...crop, ...response.data } : crop
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update crop',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteCrop: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/crops/${id}`);
      set((state) => ({
        crops: state.crops.filter((crop) => crop.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete crop',
        isLoading: false,
      });
      throw error;
    }
  },
}));
