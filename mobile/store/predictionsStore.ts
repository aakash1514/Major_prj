import { create } from 'zustand';
import { api } from '../utils/api';
import { DemandPredictionInput, PredictionResult, PricePredictionInput } from '../types';

type RawPredictionPayload = {
  features: unknown;
};

const hasFeaturesPayload = (input: unknown): input is RawPredictionPayload => {
  return typeof input === 'object' && input !== null && 'features' in input;
};

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const toPricePredictionPayload = (inputData: PricePredictionInput | RawPredictionPayload) => {
  if (hasFeaturesPayload(inputData)) {
    return inputData;
  }

  const cropSeed = encodeStringToNumber(inputData.cropName.toLowerCase());
  const locationSeed = encodeStringToNumber(inputData.location.toLowerCase());
  const harvestDate = new Date(inputData.harvestDate);
  const validDate = Number.isNaN(harvestDate.getTime()) ? new Date() : harvestDate;
  const arrivalsTonnes = inputData.unit.toLowerCase() === 'kg'
    ? inputData.quantity / 1000
    : inputData.quantity;

  return {
    features: {
      'State Name': locationSeed % 36,
      'District Name': locationSeed % 64,
      'Market Name': (locationSeed + cropSeed) % 128,
      'Variety': cropSeed % 200,
      'Group': cropSeed % 40,
      'Grade': (cropSeed % 3) + 1,
      'Arrivals (Tonnes)': Number(arrivalsTonnes.toFixed(3)),
      'Month': validDate.getMonth() + 1,
      'Day': validDate.getDate(),
      'Weekday': getWeekday(validDate),
    },
  };
};

const toDemandPredictionPayload = (inputData: DemandPredictionInput | RawPredictionPayload) => {
  if (hasFeaturesPayload(inputData)) {
    return inputData;
  }

  const now = new Date();
  const cropSeed = encodeStringToNumber(inputData.cropName.toLowerCase());
  const regionSeed = encodeStringToNumber(inputData.region.toLowerCase());
  const seasonCodeMap: Record<string, number> = {
    kharif: 1,
    rabi: 2,
    spring: 1,
    summer: 3,
    monsoon: 3,
    autumn: 4,
    winter: 5,
    'all year': 6,
  };
  const seasonCode = seasonCodeMap[inputData.season.toLowerCase()] || 0;

  return {
    features: [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      getWeekday(now),
      cropSeed % 1000,
      regionSeed % 500,
      inputData.quantity,
      seasonCode,
      cropSeed % 300,
      regionSeed % 200,
      (cropSeed + regionSeed) % 700,
      now.getHours(),
      now.getMinutes(),
      Math.max(1, Math.round(inputData.quantity / 5)),
      Math.max(1, Math.round(inputData.quantity / 10)),
      1,
    ],
  };
};

const normalizePredictionResult = (
  response: Partial<PredictionResult> & { prediction?: number; confidence?: number },
  model: string
): PredictionResult => {
  const raw = response as {
    unit?: string;
    price_breakdown?: {
      min_price?: number;
      max_price?: number;
      modal_price?: number;
      unit?: string;
      min_price_per_kg?: number;
      max_price_per_kg?: number;
      modal_price_per_kg?: number;
    };
  };

  const normalizedBreakdown = raw.price_breakdown
    ? {
        minPrice: Number(raw.price_breakdown.min_price ?? 0),
        maxPrice: Number(raw.price_breakdown.max_price ?? 0),
        modalPrice: Number(raw.price_breakdown.modal_price ?? 0),
        unit: typeof raw.price_breakdown.unit === 'string' ? raw.price_breakdown.unit : 'INR/quintal',
        minPricePerKg: Number(raw.price_breakdown.min_price_per_kg ?? 0),
        maxPricePerKg: Number(raw.price_breakdown.max_price_per_kg ?? 0),
        modalPricePerKg: Number(raw.price_breakdown.modal_price_per_kg ?? 0),
      }
    : undefined;

  return {
    prediction: Number(response.prediction ?? 0),
    confidence: Number(response.confidence ?? 0),
    model: typeof response.model === 'string' ? response.model : model,
    timestamp: typeof response.timestamp === 'string' ? response.timestamp : new Date().toISOString(),
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    priceBreakdown: normalizedBreakdown,
  };
};

interface PredictionsState {
  lastPricePrediction: PredictionResult | null;
  lastDemandPrediction: PredictionResult | null;
  isPriceLoading: boolean;
  isDemandLoading: boolean;
  priceError: string | null;
  demandError: string | null;
  fetchPricePrediction: (inputData: PricePredictionInput | RawPredictionPayload) => Promise<void>;
  fetchDemandPrediction: (inputData: DemandPredictionInput | RawPredictionPayload) => Promise<void>;
}

export const usePredictionsStore = create<PredictionsState>((set) => ({
  lastPricePrediction: null,
  lastDemandPrediction: null,
  isPriceLoading: false,
  isDemandLoading: false,
  priceError: null,
  demandError: null,

  fetchPricePrediction: async (inputData) => {
    set({ isPriceLoading: true, priceError: null });

    try {
      const payload = toPricePredictionPayload(inputData);
      const response = await api.post('/predictions/price', payload) as Partial<PredictionResult>;
      set({
        lastPricePrediction: normalizePredictionResult(response, 'price-predictor'),
        isPriceLoading: false,
      });
    } catch (error) {
      set({
        priceError: error instanceof Error ? error.message : 'Failed to fetch price prediction',
        isPriceLoading: false,
      });
    }
  },

  fetchDemandPrediction: async (inputData) => {
    set({ isDemandLoading: true, demandError: null });

    try {
      const payload = toDemandPredictionPayload(inputData);
      const response = await api.post('/predictions/demand', payload) as Partial<PredictionResult>;
      set({
        lastDemandPrediction: normalizePredictionResult(response, 'demand-predictor'),
        isDemandLoading: false,
      });
    } catch (error) {
      set({
        demandError: error instanceof Error ? error.message : 'Failed to fetch demand prediction',
        isDemandLoading: false,
      });
    }
  },
}));
