import { create } from 'zustand';
import { Crop, QualityReport, MarketplaceListing } from '../types';

interface CropsState {
  crops: Crop[];
  qualityReports: QualityReport[];
  marketplaceListings: MarketplaceListing[];
  
  // Actions
  addCrop: (crop: Crop) => void;
  updateCropStatus: (id: string, status: Crop['status']) => void;
  addQualityReport: (report: QualityReport) => void;
  createMarketplaceListing: (listing: MarketplaceListing) => void;
  fetchCropsByFarmer: (token: string) => Promise<void>;
  setCrops: (crops: Crop[]) => void;
  
  // Getters
  getCropsByFarmer: (farmerId: string) => Crop[];
  getMarketplaceListings: () => MarketplaceListing[];
  getCropById: (id: string) => Crop | undefined;
  getQualityReportByCropId: (cropId: string) => QualityReport | undefined;
}

// Mock initial data
const initialCrops: Crop[] = [
  {
    id: 'c1',
    farmerId: 'f1',
    name: 'Organic Wheat',
    quantity: 500,
    unit: 'kg',
    harvestDate: new Date('2025-05-15'),
    images: ['https://images.pexels.com/photos/326082/pexels-photo-326082.jpeg'],
    description: 'Premium organic wheat grown without pesticides',
    status: 'approved',
    price: 280,
    tac: 'Standard market terms apply',
  },
  {
    id: 'c2',
    farmerId: 'f1',
    name: 'Fresh Tomatoes',
    quantity: 200,
    unit: 'kg',
    harvestDate: new Date('2025-05-20'),
    images: ['https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg'],
    description: 'Vine-ripened tomatoes, picked at peak freshness',
    status: 'listed',
    price: 320,
    tac: 'Standard market terms apply',
  },
];

const initialQualityReports: QualityReport[] = [
  {
    id: 'qr1',
    cropId: 'c1',
    agentId: 'ag1',
    date: new Date('2025-05-16'),
    weight: 495,
    size: 'Medium',
    condition: 'Excellent',
    images: ['https://images.pexels.com/photos/326082/pexels-photo-326082.jpeg'],
    notes: 'High quality grain with consistent size',
    recommendation: 'approve',
  }
];

const initialMarketplaceListings: MarketplaceListing[] = [
  {
    id: 'ml1',
    cropId: 'c2',
    price: 320,
    availability: 200,
    unit: 'kg',
    status: 'active',
    listedDate: new Date('2025-05-22'),
  }
];

export const useCropsStore = create<CropsState>((set, get) => ({
  crops: initialCrops,
  qualityReports: initialQualityReports,
  marketplaceListings: initialMarketplaceListings,
  
  addCrop: (crop) => set((state) => ({ 
    crops: [...state.crops, crop] 
  })),
  
  updateCropStatus: (id, status) => set((state) => ({
    crops: state.crops.map(crop => 
      crop.id === id ? { ...crop, status } : crop
    ),
  })),
  
  addQualityReport: (report) => set((state) => ({ 
    qualityReports: [...state.qualityReports, report] 
  })),
  
  createMarketplaceListing: (listing) => set((state) => ({ 
    marketplaceListings: [...state.marketplaceListings, listing] 
  })),
  
  setCrops: (crops) => set({ crops }),
  
  fetchCropsByFarmer: async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/farmer/crops', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch crops:', response.status);
        return;
      }
      
      const data = await response.json();
      
      // Backend returns array directly, not wrapped in { crops: ... }
      const cropsArray = Array.isArray(data) ? data : (data.crops || []);
      
      const crops = cropsArray.map((crop: any) => ({
        id: crop.id,
        farmerId: crop.farmer_id,
        name: crop.name,
        quantity: Number(crop.quantity),
        unit: crop.unit,
        harvestDate: new Date(crop.harvest_date),
        images: crop.images || [],
        description: crop.description,
        status: crop.status,
        price: crop.price ? Number(crop.price) : 0,
        tac: crop.tac,
      }));
      
      console.log('📥 Fetched crops from backend:', crops);
      set({ crops });
    } catch (error) {
      console.error('Error fetching crops:', error);
    }
  },
  
  getCropsByFarmer: (farmerId) => {
    return get().crops.filter(crop => crop.farmerId === farmerId);
  },
  
  getMarketplaceListings: () => {
    return get().marketplaceListings.filter(listing => listing.status === 'active');
  },
  
  getCropById: (id) => {
    return get().crops.find(crop => crop.id === id);
  },
  
  getQualityReportByCropId: (cropId) => {
    return get().qualityReports.find(report => report.cropId === cropId);
  },
}));