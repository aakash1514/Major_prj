import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';

type CropStatusFilter = 'all' | 'pending' | 'approved' | 'listed' | 'sold' | 'rejected';

interface SubmissionCrop {
  id: string;
  farmerId: string;
  name: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  images: string[];
  description?: string;
  status: string;
  price?: number;
  tac?: string;
}

interface PricePredictionResult {
  prediction: number | null;
  confidence: number | null;
  loading: boolean;
  error?: string;
}

const STATUS_TABS: Array<{ label: string; value: CropStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Listed', value: 'listed' },
  { label: 'Sold', value: 'sold' },
  { label: 'Rejected', value: 'rejected' },
];

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const buildPricePredictionInput = (crop: {
  name: string;
  quantity: number;
  harvestDate: string;
}) => {
  const cropSeed = encodeStringToNumber(crop.name.toLowerCase());
  const harvestDate = new Date(crop.harvestDate);

  return {
    features: {
      'State Name': cropSeed % 36,
      'District Name': cropSeed % 64,
      'Market Name': cropSeed % 128,
      Variety: cropSeed % 200,
      Group: cropSeed % 40,
      Grade: (cropSeed % 3) + 1,
      'Arrivals (Tonnes)': Number((crop.quantity / 1000).toFixed(3)),
      Month: Number.isNaN(harvestDate.getTime()) ? 1 : harvestDate.getMonth() + 1,
      Day: Number.isNaN(harvestDate.getTime()) ? 1 : harvestDate.getDate(),
      Weekday: Number.isNaN(harvestDate.getTime()) ? 1 : getWeekday(harvestDate),
    },
  };
};

const normalizeCrops = (raw: any[]): SubmissionCrop[] => {
  return raw.map((crop) => ({
    id: String(crop.id),
    farmerId: String(crop.farmer_id ?? crop.farmerId ?? ''),
    name: String(crop.name ?? 'Crop'),
    quantity: Number(crop.quantity ?? 0),
    unit: String(crop.unit ?? 'kg'),
    harvestDate: String(crop.harvest_date ?? crop.harvestDate ?? new Date().toISOString()),
    images: Array.isArray(crop.images) ? crop.images : [],
    description: crop.description || '',
    status: String(crop.status ?? 'pending').toLowerCase(),
    price: Number(crop.price ?? 0),
    tac: crop.tac || '',
  }));
};

export default function CropSubmissionsScreen() {
  const [crops, setCrops] = useState<SubmissionCrop[]>([]);
  const [filter, setFilter] = useState<CropStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<SubmissionCrop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pricePredictions, setPricePredictions] = useState<
    Record<string, PricePredictionResult>
  >({});

  const fetchCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        const adminCrops = await api.get('/admin/crops');
        const cropsArray = Array.isArray(adminCrops)
          ? adminCrops
          : Array.isArray((adminCrops as { crops?: any[] })?.crops)
          ? (adminCrops as { crops: any[] }).crops
          : [];
        setCrops(normalizeCrops(cropsArray));
      } catch {
        const allCrops = await api.get('/crops');
        const cropsArray = Array.isArray(allCrops)
          ? allCrops
          : Array.isArray((allCrops as { crops?: any[] })?.crops)
          ? (allCrops as { crops: any[] }).crops
          : [];
        setCrops(normalizeCrops(cropsArray));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch crops');
      setCrops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchCrops();
    }, [fetchCrops])
  );

  useEffect(() => {
    let cancelled = false;

    const fetchPredictions = async () => {
      if (!crops.length) {
        setPricePredictions({});
        return;
      }

      const initialState = Object.fromEntries(
        crops.map((crop) => [
          crop.id,
          { prediction: null, confidence: null, loading: true } as PricePredictionResult,
        ])
      );
      setPricePredictions(initialState);

      const results = await Promise.all(
        crops.map(async (crop) => {
          try {
            const response = (await api.post(
              '/predictions/price',
              buildPricePredictionInput(crop)
            )) as {
              prediction: number;
              confidence: number;
            };

            return [
              crop.id,
              {
                prediction: Number(response.prediction),
                confidence: Number(response.confidence),
                loading: false,
              } as PricePredictionResult,
            ] as const;
          } catch (err) {
            return [
              crop.id,
              {
                prediction: null,
                confidence: null,
                loading: false,
                error: err instanceof Error ? err.message : 'Prediction unavailable',
              } as PricePredictionResult,
            ] as const;
          }
        })
      );

      if (!cancelled) {
        setPricePredictions(Object.fromEntries(results));
      }
    };

    void fetchPredictions();

    return () => {
      cancelled = true;
    };
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (filter === 'all') return crops;
    return crops.filter((crop) => crop.status === filter);
  }, [crops, filter]);

  const renderPricePredictionBadge = (crop: SubmissionCrop) => {
    const state = pricePredictions[crop.id];

    if (!state || state.loading) {
      return <Badge variant="default" label="AI: checking..." />;
    }

    if (state.prediction === null || state.error) {
      return <Badge variant="default" label="AI: unavailable" />;
    }

    const listedPrice = Number(crop.price || 0);
    const prediction = Number(state.prediction || 0);
    const diffRatio = listedPrice > 0 ? Math.abs((listedPrice - prediction) / listedPrice) : 0;
    const variant = diffRatio <= 0.1 ? 'success' : diffRatio <= 0.25 ? 'warning' : 'danger';

    return <Badge variant={variant} label={`AI: ₹${prediction.toFixed(2)}`} />;
  };

  const runCropAction = async (
    cropId: string,
    action: 'approve' | 'reject',
    body: Record<string, unknown>
  ) => {
    setActionLoading(true);
    try {
      try {
        await api.put(`/admin/crops/${cropId}/${action}`, body);
      } catch {
        await api.post(`/admin/crops/${cropId}/${action}`, body);
      }

      setSelectedCrop(null);
      await fetchCrops();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} crop`);
    } finally {
      setActionLoading(false);
    }
  };

  const listOnMarketplace = async (crop: SubmissionCrop) => {
    setActionLoading(true);
    try {
      const payload = {
        price: Number(crop.price || 0),
        availability: 'available',
      };

      try {
        await api.put(`/admin/crops/${crop.id}/list`, payload);
      } catch {
        await api.post(`/admin/crops/${crop.id}/list`, payload);
      }

      setSelectedCrop(null);
      await fetchCrops();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list crop');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading submissions..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Crop Submissions" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {STATUS_TABS.map((tab) => {
          const active = tab.value === filter;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tabChip, active && styles.tabChipActive]}
              onPress={() => setFilter(tab.value)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredCrops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No crop submissions for this status.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.82} onPress={() => setSelectedCrop(item)}>
            <Card style={styles.cropCard}>
              <CardContent>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardMainInfo}>
                    <Text style={styles.cropName}>{item.name}</Text>
                    <Text style={styles.metaText}>Farmer ID: {item.farmerId}</Text>
                  </View>
                  <StatusBadge status={item.status as any} />
                </View>

                <View style={styles.cardBottomRow}>
                  <Text style={styles.metaText}>
                    Qty: {item.quantity} {item.unit}
                  </Text>
                  {renderPricePredictionBadge(item)}
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        )}
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
              {selectedCrop.images?.[0] ? (
                <Image source={{ uri: selectedCrop.images[0] }} style={styles.modalImage} />
              ) : (
                <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                  <Text style={styles.modalImagePlaceholderText}>
                    {selectedCrop.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <Text style={styles.modalTitle}>{selectedCrop.name}</Text>
              <Text style={styles.modalDesc}>
                {selectedCrop.description || 'No description provided.'}
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Farmer ID</Text>
                <Text style={styles.detailValue}>{selectedCrop.farmerId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <StatusBadge status={selectedCrop.status as any} />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {selectedCrop.quantity} {selectedCrop.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Listed Price</Text>
                <Text style={styles.detailValue}>
                  ₹{Number(selectedCrop.price || 0).toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {selectedCrop.status === 'pending' ? (
                <View style={styles.actionRow}>
                  <Button
                    title="Reject"
                    onPress={() => {
                      void runCropAction(selectedCrop.id, 'reject', {
                        reason: 'Rejected by admin',
                      });
                    }}
                    variant="danger"
                    disabled={actionLoading}
                    loading={actionLoading}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Approve"
                    onPress={() => {
                      void runCropAction(selectedCrop.id, 'approve', {
                        price: Number(selectedCrop.price || 0),
                      });
                    }}
                    variant="primary"
                    disabled={actionLoading}
                    loading={actionLoading}
                    style={styles.actionBtn}
                  />
                </View>
              ) : null}

              {selectedCrop.status === 'approved' ? (
                <View style={styles.actionRow}>
                  <Button
                    title="List on Marketplace"
                    onPress={() => {
                      void listOnMarketplace(selectedCrop);
                    }}
                    variant="primary"
                    disabled={actionLoading}
                    loading={actionLoading}
                    style={styles.actionBtn}
                  />
                </View>
              ) : null}
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
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  tabsScroll: {
    maxHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 8,
  },
  tabsRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.surface,
  },
  listContent: {
    padding: 16,
  },
  cropCard: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardMainInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardBottomRow: {
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalImagePlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImagePlaceholderText: {
    color: Colors.surface,
    fontSize: 54,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '64%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
  },
});
