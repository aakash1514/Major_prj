import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../../utils/api';
import { DemandPredictionInput, PredictionResult, PricePredictionInput } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/Card';
import { Colors } from '../../constants/Colors';

type PredictionMode = 'price' | 'demand';
type PredictionInputData = PricePredictionInput | DemandPredictionInput | { features: unknown };

interface PredictionPanelProps {
  mode: PredictionMode;
  inputData: PredictionInputData;
  cropName: string;
  style?: any;
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
  style,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

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
    <Card style={style}>
      <CardHeader>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.cropLabel}>Crop: {cropName}</Text>
          </View>
          <Badge variant="info" label="AI estimate" />
        </View>
      </CardHeader>

      <CardContent>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.info} />
            <Text style={styles.loadingText}>Fetching latest prediction...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              {serviceUnavailable ? 'Prediction service unavailable' : 'Prediction failed'}
            </Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && result && (
          <View style={styles.resultContainer}>
            <Text style={styles.metricLabel}>{metricLabel}</Text>
            <Text style={styles.predictionValue}>
              {formatPredictionValue(mode, result.prediction, result)}
            </Text>
            {mode === 'price' && result.priceBreakdown && (
              <Text style={styles.breakdownText}>
                Model output: Min ₹{result.priceBreakdown.minPrice.toFixed(2)}, Max ₹{result.priceBreakdown.maxPrice.toFixed(2)}, Modal ₹{result.priceBreakdown.modalPrice.toFixed(2)}
              </Text>
            )}
            {mode === 'price' && totalEstimate !== null && (
              <Text style={styles.breakdownText}>
                Estimated total for {selectedQuantityKg} kg: ₹{totalEstimate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            )}
            <View style={styles.badgeContainer}>
              <Badge
                variant={getConfidenceBadgeVariant(result.confidence)}
                label={formatConfidence(result.confidence)}
              />
            </View>
          </View>
        )}
      </CardContent>

      <CardFooter>
        <Button
          title={loading ? 'Refreshing...' : 'Refresh prediction'}
          onPress={() => {
            void fetchPrediction();
          }}
          disabled={loading}
          variant="outline"
          size="sm"
        />
      </CardFooter>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cropLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.info,
    backgroundColor: '#eff6ff',
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.info,
    flex: 1,
  },
  errorContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: '#fef2f2',
    padding: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginTop: 4,
  },
  resultContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
    padding: 16,
  },
  metricLabel: {
    fontSize: 13,
    color: Colors.success,
  },
  predictionValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  breakdownText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.success,
  },
  badgeContainer: {
    marginTop: 12,
  },
});

export default PredictionPanel;

