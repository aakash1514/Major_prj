import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../utils/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { Colors } from '../../../constants/Colors';
import { Crop } from '../../../types';

export default function FarmerCropDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [crop, setCrop] = useState<Crop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrop = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = (await api.get(`/crops/${id}`)) as any;
      const normalized: Crop = {
        id: String(data.id),
        farmerId: String(data.farmer_id ?? data.farmerId ?? ''),
        name: String(data.name ?? 'Crop'),
        quantity: Number(data.quantity ?? 0),
        unit: String(data.unit ?? 'kg'),
        harvestDate: new Date(data.harvest_date ?? data.harvestDate ?? Date.now()),
        images: Array.isArray(data.images) ? data.images : [],
        description: data.description || '',
        status: (data.status || 'pending') as Crop['status'],
        price: Number(data.price ?? 0),
        tac: data.tac || '',
      };
      setCrop(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crop');
      setCrop(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchCrop();
  }, [fetchCrop]);

  if (loading) {
    return <LoadingSpinner message="Loading crop..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <ScreenHeader
            title="Crop Details"
            rightAction={{
              label: 'X',
              onPress: () => {
                router.replace('/(farmer)/my-crops');
              },
            }}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {crop ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Card style={styles.heroCard}>
                <CardContent style={styles.heroContent}>
                  {crop.images && crop.images[0] ? (
                    <Image source={{ uri: crop.images[0] }} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>{crop.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.heroText}>
                    <Text style={styles.cropName}>{crop.name}</Text>
                    <Text style={styles.cropMeta}>
                      {crop.quantity} {crop.unit}
                    </Text>
                    <Text style={styles.cropPrice}>
                      ₹{Number(crop.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                    <Badge label={crop.status} variant="info" style={styles.statusBadge} />
                  </View>
                </CardContent>
              </Card>

              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>Description</Text>
                </CardHeader>
                <CardContent>
                  <Text style={styles.sectionBody}>{crop.description || 'No description provided.'}</Text>
                </CardContent>
              </Card>

              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>Harvest Details</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Harvest Date</Text>
                    <Text style={styles.detailValue}>
                      {crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString('en-IN') : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>{crop.status}</Text>
                  </View>
                </CardContent>
              </Card>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  heroCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroContent: {
    padding: 0,
  },
  image: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.surface,
  },
  heroText: {
    padding: 16,
    gap: 6,
  },
  cropName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cropMeta: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cropPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
