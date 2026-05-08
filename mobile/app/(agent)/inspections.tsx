import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';

interface PendingCrop {
  id: string;
  farmerId: string;
  farmerName?: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  status: string;
}

interface DemandPredictionResult {
  prediction: number | null;
  confidence: number | null;
  loading: boolean;
  error?: string;
}

interface ReportFormData {
  weight: string;
  size: string;
  condition: string;
  notes: string;
  recommendation: 'approve' | 'reject';
}

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const buildDemandInputData = (crop: PendingCrop) => {
  const now = new Date();
  const cropSeed = encodeStringToNumber(crop.name.toLowerCase());
  const farmerSeed = encodeStringToNumber((crop.farmerName || crop.farmerId || 'farmer').toLowerCase());

  return {
    features: [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      getWeekday(now),
      cropSeed % 1000,
      farmerSeed % 500,
      crop.quantity,
      cropSeed % 300,
      farmerSeed % 200,
      (cropSeed + farmerSeed) % 700,
      now.getHours(),
      now.getMinutes(),
      Math.max(1, Math.round(crop.quantity / 5)),
      Math.max(1, Math.round(crop.quantity / 10)),
      1,
      1,
    ],
  };
};

const normalizeCrops = (raw: any[]): PendingCrop[] => {
  return raw.map((crop) => ({
    id: String(crop.id),
    farmerId: String(crop.farmer_id ?? crop.farmerId ?? ''),
    farmerName: crop.farmer_name ? String(crop.farmer_name) : undefined,
    name: String(crop.name || 'Crop'),
    quantity: Number(crop.quantity ?? 0),
    unit: String(crop.unit || 'kg'),
    description: crop.description || '',
    status: String(crop.status || 'pending'),
  }));
};

const demandTier = (prediction: number | null, error?: string) => {
  if (prediction === null || error) {
    return { label: 'Unknown', variant: 'default' as const };
  }

  if (prediction >= 75) return { label: 'High', variant: 'success' as const };
  if (prediction >= 40) return { label: 'Medium', variant: 'warning' as const };
  return { label: 'Low', variant: 'danger' as const };
};

export default function InspectionsScreen() {
  const [crops, setCrops] = useState<PendingCrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<PendingCrop | null>(null);
  const [farmerLookup, setFarmerLookup] = useState<Map<string, string>>(new Map());
  const [demandPredictions, setDemandPredictions] = useState<
    Record<string, DemandPredictionResult>
  >({});
  const [reportLoading, setReportLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportFormData>({
    defaultValues: {
      weight: '',
      size: '',
      condition: '',
      notes: '',
      recommendation: 'approve',
    },
  });

  const fetchPendingCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = (await api.get('/agent/inspections/pending')) as any[];
      const normalized = normalizeCrops(Array.isArray(data) ? data : []);
      setCrops(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inspections');
      setCrops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPendingCrops();
    }, [fetchPendingCrops])
  );

  useEffect(() => {
    let cancelled = false;

    const fetchFarmerInfo = async () => {
      if (!crops.length) {
        setFarmerLookup(new Map());
        return;
      }

      const entries = await Promise.all(
        crops.map(async (crop) => {
          if (!crop.farmerId) return [crop.farmerId, crop.farmerName || 'Unknown Farmer'] as const;

          try {
            const user = (await api.get(`/users/${crop.farmerId}`)) as { name?: string };
            return [crop.farmerId, user.name || crop.farmerName || 'Unknown Farmer'] as const;
          } catch {
            return [crop.farmerId, crop.farmerName || 'Unknown Farmer'] as const;
          }
        })
      );

      if (!cancelled) {
        const map = new Map<string, string>();
        entries.forEach(([id, name]) => map.set(id, name));
        setFarmerLookup(map);
        setCrops((prev) =>
          prev.map((crop) => ({
            ...crop,
            farmerName: map.get(crop.farmerId) || crop.farmerName,
          }))
        );
      }
    };

    void fetchFarmerInfo();

    return () => {
      cancelled = true;
    };
  }, [crops]);

  useEffect(() => {
    let cancelled = false;

    const fetchPredictions = async () => {
      if (!crops.length) {
        setDemandPredictions({});
        return;
      }

      const initialState = Object.fromEntries(
        crops.map((crop) => [
          crop.id,
          { prediction: null, confidence: null, loading: true } as DemandPredictionResult,
        ])
      );
      setDemandPredictions(initialState);

      const results = await Promise.all(
        crops.map(async (crop) => {
          try {
            const response = (await api.post('/predictions/demand', buildDemandInputData(crop))) as {
              prediction: number;
              confidence: number;
            };

            return [
              crop.id,
              {
                prediction: Number(response.prediction),
                confidence: Number(response.confidence),
                loading: false,
              } as DemandPredictionResult,
            ] as const;
          } catch (err) {
            return [
              crop.id,
              {
                prediction: null,
                confidence: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Prediction unavailable',
              } as DemandPredictionResult,
            ] as const;
          }
        })
      );

      if (!cancelled) {
        setDemandPredictions(Object.fromEntries(results));
      }
    };

    void fetchPredictions();

    return () => {
      cancelled = true;
    };
  }, [crops]);

  const openReportModal = (crop: PendingCrop) => {
    setSelectedCrop(crop);
    reset({
      weight: '',
      size: '',
      condition: '',
      notes: '',
      recommendation: 'approve',
    });
  };

  const submitReport = async (data: ReportFormData) => {
    if (!selectedCrop) return;

    try {
      setReportLoading(true);
      setError(null);

      const payload = {
        cropId: selectedCrop.id,
        weight: Number(data.weight),
        size: data.size,
        condition: data.condition,
        notes: data.notes,
        recommendation: data.recommendation,
      };

      await api.post('/agent/inspections', payload);

      setSelectedCrop(null);
      await fetchPendingCrops();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading inspections..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Inspections" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={crops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No pending inspections right now.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => {
          const prediction = demandPredictions[item.id];
          const tier = demandTier(prediction?.prediction ?? null, prediction?.error);

          return (
            <Card style={styles.card}>
              <CardContent>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cropName}>{item.name}</Text>
                    <Text style={styles.metaText}>Farmer: {item.farmerName || item.farmerId}</Text>
                    <Text style={styles.metaText}>
                      Qty: {item.quantity} {item.unit}
                    </Text>
                  </View>
                  <Badge label={`Demand: ${tier.label}`} variant={tier.variant} />
                </View>

                <View style={styles.insightRow}>
                  <Text style={styles.insightText}>
                    {prediction?.loading ? 'Calculating demand...' : 'AI demand outlook'}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Submit Report"
                    onPress={() => openReportModal(item)}
                    variant="primary"
                    size="sm"
                  />
                </View>
              </CardContent>
            </Card>
          );
        }}
      />

      <Modal
        transparent
        animationType="slide"
        visible={Boolean(selectedCrop)}
        onRequestClose={() => setSelectedCrop(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedCrop(null)} />
          {selectedCrop ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Submit Report</Text>
              <Text style={styles.modalMeta}>Crop: {selectedCrop.name}</Text>

              <Controller
                control={control}
                name="weight"
                rules={{ required: 'Weight is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Weight"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. 12.5"
                    keyboardType="decimal-pad"
                    error={errors.weight?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="size"
                rules={{ required: 'Size is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Size"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. Large"
                    error={errors.size?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="condition"
                rules={{ required: 'Condition is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Condition"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. Good"
                    error={errors.condition?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Optional notes"
                    multiline
                    numberOfLines={3}
                  />
                )}
              />

              <Controller
                control={control}
                name="recommendation"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.recommendationRow}>
                    {(['approve', 'reject'] as const).map((option) => {
                      const active = value === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.recChip, active && styles.recChipActive]}
                          onPress={() => onChange(option)}
                        >
                          <Text style={[styles.recText, active && styles.recTextActive]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedCrop(null)}
                  variant="outline"
                  size="md"
                  disabled={reportLoading}
                  style={styles.modalBtn}
                />
                <Button
                  title="Submit"
                  onPress={handleSubmit(submitReport)}
                  variant="primary"
                  size="md"
                  loading={reportLoading}
                  disabled={reportLoading}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: '#fef2f2',
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  cardMain: {
    flex: 1,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  insightRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  insightText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  recommendationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  recChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  recChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  recTextActive: {
    color: Colors.surface,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
  },
});
