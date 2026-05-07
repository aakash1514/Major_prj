export type UserRole = 'farmer' | 'buyer' | 'admin' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location?: string;
  contactNumber?: string;
  profileImage?: string;
  createdAt: Date;
}

export interface Farmer extends User {
  kyc: boolean;
  farmDetails?: {
    size: number;
    location: string;
    cropTypes: string[];
  };
}

export interface Buyer extends User {
  kyc: boolean;
  preferences?: string[];
  purchaseHistory?: Order[];
}

export interface Crop {
  id: string;
  farmerId: string;
  name: string;
  quantity: number;
  unit: string;
  harvestDate: Date;
  images: string[];
  description?: string;
  status: 'pending' | 'inspected' | 'approved' | 'rejected' | 'listed' | 'sold';
  price?: number;
  tac?: string; // Terms and conditions
}

export interface QualityReport {
  id: string;
  cropId: string;
  agentId: string;
  date: Date;
  weight: number;
  size: string;
  condition: string;
  images: string[];
  notes?: string;
  recommendation: 'approve' | 'reject';
}

export interface Order {
  id: string;
  buyerId: string;
  cropId: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'in-transit' | 'delivered';
  paymentStatus: 'pending' | 'advance-paid' | 'fully-paid';
  advanceAmount?: number;
  totalAmount: number;
  createdAt: Date;
  transporterId?: string;
}

export interface TransportLog {
  id: string;
  orderId: string;
  cropId: string;
  agentId: string;
  status: 'assigned' | 'loaded' | 'in-transit' | 'delivered';
  pickupDate?: Date;
  deliveryDate?: Date;
  notes?: string;
}

export interface MarketplaceListing {
  id: string;
  cropId: string;
  price: number;
  availability: number;
  unit: string;
  status: 'active' | 'sold' | 'unavailable';
  listedDate: Date;
}

export interface PricePredictionInput {
  cropName: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  location: string;
}

export interface DemandPredictionInput {
  cropName: string;
  season: string;
  region: string;
  quantity: number;
}

export interface PredictionResult {
  prediction: number;
  confidence: number;
  model: string;
  timestamp: string;
  unit?: string;
  priceBreakdown?: {
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    unit: string;
    minPricePerKg: number;
    maxPricePerKg: number;
    modalPricePerKg: number;
  };
}