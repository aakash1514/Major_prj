import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { DemandPredictionInput, PredictionResult, PricePredictionInput } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

type PredictionMode = 'price' | 'demand';
type PredictionInputData = PricePredictionInput | DemandPredictionInput | { features: unknown };

interface PredictionPanelProps {
  mode: PredictionMode;
  inputData: PredictionInputData;
  cropName: string;
  className?: string;
}

const isTypedPriceInput = (input: PredictionInputData): input is PricePredictionInput => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'cropName' in input &&
    'quantity' in input &&
    'unit' in input &&
    'harvestDate' in input &&
    'location' in input
  );
};

const hasFeaturesPayload = (input: PredictionInputData): input is { features: unknown } => {
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

const toModelPayload = (mode: PredictionMode, inputData: PredictionInputData) => {
  if (hasFeaturesPayload(inputData)) {
    return inputData;
  }

  if (mode === 'price') {
    const typedInput = inputData as PricePredictionInput;
    const cropSeed = encodeStringToNumber(typedInput.cropName.toLowerCase());
    const locationSeed = encodeStringToNumber(typedInput.location.toLowerCase());
    const harvestDate = new Date(typedInput.harvestDate);
    const validDate = Number.isNaN(harvestDate.getTime()) ? new Date() : harvestDate;
    const arrivalsTonnes = typedInput.unit.toLowerCase() === 'kg'
      ? typedInput.quantity / 1000
      : typedInput.quantity;

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
  }

  const typedInput = inputData as DemandPredictionInput;
  const now = new Date();
  const cropSeed = encodeStringToNumber(typedInput.cropName.toLowerCase());
  const regionSeed = encodeStringToNumber(typedInput.region.toLowerCase());
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
  const seasonCode = seasonCodeMap[typedInput.season.toLowerCase()] || 0;

  return {
    features: [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      getWeekday(now),
      cropSeed % 1000,
      regionSeed % 500,
      typedInput.quantity,
      seasonCode,
      cropSeed % 300,
      regionSeed % 200,
      (cropSeed + regionSeed) % 700,
      now.getHours(),
      now.getMinutes(),
      Math.max(1, Math.round(typedInput.quantity / 5)),
      Math.max(1, Math.round(typedInput.quantity / 10)),
      1,
    ],
  };
};

const normalizePredictionResult = (
  response: Partial<PredictionResult> & { prediction?: number; confidence?: number },
  mode: PredictionMode
): PredictionResult => {
  const raw = response as {
    price_breakdown?: {
      min_price?: number;
      max_price?: number;
      modal_price?: number;
      unit?: string;
      min_price_per_kg?: number;
      max_price_per_kg?: number;
      modal_price_per_kg?: number;
    };
    priceBreakdown?: PredictionResult['priceBreakdown'];
    unit?: string;
  };

  const breakdown = raw.price_breakdown;
  const normalizedBreakdown = breakdown
    ? {
        minPrice: Number(breakdown.min_price ?? 0),
        maxPrice: Number(breakdown.max_price ?? 0),
        modalPrice: Number(breakdown.modal_price ?? 0),
        unit: typeof breakdown.unit === 'string' ? breakdown.unit : 'INR/quintal',
        minPricePerKg: Number(breakdown.min_price_per_kg ?? 0),
        maxPricePerKg: Number(breakdown.max_price_per_kg ?? 0),
        modalPricePerKg: Number(breakdown.modal_price_per_kg ?? 0),
      }
    : raw.priceBreakdown;

  return {
    prediction: Number(response.prediction ?? 0),
    confidence: Number(response.confidence ?? 0),
    model: typeof response.model === 'string' ? response.model : mode === 'price' ? 'price-predictor' : 'demand-predictor',
    timestamp: typeof response.timestamp === 'string' ? response.timestamp : new Date().toISOString(),
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    priceBreakdown: normalizedBreakdown,
  };
};

const getConfidenceBadgeVariant = (confidence: number) => {
  if (confidence >= 0.75) return 'success' as const;
  if (confidence >= 0.5) return 'warning' as const;
  return 'danger' as const;
};

const formatConfidence = (confidence: number) => {
  const percent = Math.max(0, Math.min(100, confidence * 100));
  return `${percent.toFixed(0)}% confidence`;
};

const formatPredictionValue = (
  mode: PredictionMode,
  prediction: number,
  result?: PredictionResult
) => {
  if (mode === 'price') {
    if (result?.priceBreakdown?.modalPrice) {
      return `₹${result.priceBreakdown.modalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    if (result?.unit === 'INR/quintal') {
      return `₹${prediction.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    return `₹${prediction.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  return prediction.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  mode,
  inputData,
  cropName,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Full endpoint path: http://localhost:5000/api/predictions/{price|demand} via src/utils/api.
  const endpoint = mode === 'price' ? '/predictions/price' : '/predictions/demand';
  const payload = useMemo(() => toModelPayload(mode, inputData), [mode, inputData]);

  const fetchPrediction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(endpoint, payload) as Partial<PredictionResult>;
      setResult(normalizePredictionResult(response, mode));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prediction';
      setResult(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, mode, payload]);

  const inputSignature = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    void fetchPrediction();
  }, [fetchPrediction, inputSignature]);

  const title = mode === 'price' ? 'Price Prediction' : 'Demand Prediction';
  const metricLabel = mode === 'price' ? 'Estimated price' : 'Estimated demand';
  const serviceUnavailable =
    error?.toLowerCase().includes('prediction service unavailable') ?? false;
  const selectedQuantityKg = isTypedPriceInput(inputData) ? Number(inputData.quantity) : null;
  const ratePerKg = result?.priceBreakdown?.modalPricePerKg
    ?? (mode === 'price' && result?.unit === 'INR/quintal' ? result.prediction / 100 : null);
  const totalEstimate =
    mode === 'price' && selectedQuantityKg && selectedQuantityKg > 0 && ratePerKg
      ? ratePerKg * selectedQuantityKg
      : null;

  return (
    <Card className={`border border-green-100 ${className}`}>
      <CardHeader className="bg-green-50/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-green-900">{title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Crop: {cropName}</p>
          </div>
          <Badge variant="info" size="sm">
            AI estimate
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-blue-900">Fetching latest prediction...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-900">
              {serviceUnavailable ? 'Prediction service unavailable' : 'Prediction failed'}
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && result && (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">{metricLabel}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-900">
              {formatPredictionValue(mode, result.prediction, result)}
            </p>
            {mode === 'price' && result.priceBreakdown && (
              <p className="mt-2 text-xs text-emerald-800">
                Model output: Min ₹{result.priceBreakdown.minPrice.toFixed(2)}, Max ₹{result.priceBreakdown.maxPrice.toFixed(2)}, Modal ₹{result.priceBreakdown.modalPrice.toFixed(2)}
              </p>
            )}
            {mode === 'price' && totalEstimate !== null && (
              <p className="mt-1 text-xs text-emerald-800">
                Estimated total for {selectedQuantityKg} kg: ₹{totalEstimate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            )}
            <div className="mt-3">
              <Badge variant={getConfidenceBadgeVariant(result.confidence)} size="sm">
                {formatConfidence(result.confidence)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void fetchPrediction();
          }}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh prediction'}
        </Button>
      </CardFooter>
    </Card>
  );
};
