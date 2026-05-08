import { create } from 'zustand';
import { api } from '../utils/api';
import { Order } from '../types';

interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  fetchBuyerOrders: () => Promise<void>;
  fetchFarmerOrders: () => Promise<void>;
  createOrder: (data: any) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/orders');
      set({ orders: response.data || response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        isLoading: false,
      });
    }
  },

  fetchBuyerOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/buyers/orders');
      set({ orders: response.data || response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch buyer orders',
        isLoading: false,
      });
    }
  },

  fetchFarmerOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/farmer/orders');
      set({ orders: response.data || response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch farmer orders',
        isLoading: false,
      });
    }
  },

  createOrder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/orders', data);
      set((state) => ({
        orders: [...state.orders, response.data || response],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create order',
        isLoading: false,
      });
      throw error;
    }
  },
}));
