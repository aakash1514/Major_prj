import { create } from 'zustand';
import { Order, TransportLog } from '../types';

interface OrdersState {
  orders: Order[];
  transportLogs: TransportLog[];
  
  // Actions
  createOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  updatePaymentStatus: (id: string, paymentStatus: Order['paymentStatus']) => void;
  addTransportLog: (log: TransportLog) => void;
  updateTransportStatus: (id: string, status: TransportLog['status']) => void;
  
  // Getters
  getOrdersByBuyer: (buyerId: string) => Order[];
  getOrderById: (id: string) => Order | undefined;
  getTransportLogsByOrder: (orderId: string) => TransportLog[];
}

// Mock initial data
const initialOrders: Order[] = [
  {
    id: 'o1',
    buyerId: 'b1',
    cropId: 'c1',
    status: 'confirmed',
    paymentStatus: 'advance-paid',
    advanceAmount: 70,
    totalAmount: 280,
    createdAt: new Date('2025-05-18'),
  }
];

const initialTransportLogs: TransportLog[] = [
  {
    id: 'tl1',
    orderId: 'o1',
    cropId: 'c1',
    agentId: 'ag1',
    status: 'assigned',
    notes: 'Scheduled for pickup',
  }
];

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: initialOrders,
  transportLogs: initialTransportLogs,
  
  createOrder: (order) => set((state) => ({ 
    orders: [...state.orders, order] 
  })),
  
  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map(order => 
      order.id === id ? { ...order, status } : order
    ),
  })),
  
  updatePaymentStatus: (id, paymentStatus) => set((state) => ({
    orders: state.orders.map(order => 
      order.id === id ? { ...order, paymentStatus } : order
    ),
  })),
  
  addTransportLog: (log) => set((state) => ({ 
    transportLogs: [...state.transportLogs, log] 
  })),
  
  updateTransportStatus: (id, status) => set((state) => ({
    transportLogs: state.transportLogs.map(log => 
      log.id === id ? { ...log, status } : log
    ),
  })),
  
  getOrdersByBuyer: (buyerId) => {
    return get().orders.filter(order => order.buyerId === buyerId);
  },
  
  getOrderById: (id) => {
    return get().orders.find(order => order.id === id);
  },
  
  getTransportLogsByOrder: (orderId) => {
    return get().transportLogs.filter(log => log.orderId === orderId);
  },
}));