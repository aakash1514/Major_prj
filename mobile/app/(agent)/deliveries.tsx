import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
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

type DeliveryStatus = 'assigned' | 'loaded' | 'in-transit' | 'delivered';

interface DeliveryItem {
  id: string;
  cropName: string;
  buyerName: string;
  buyerLocation?: string;
  status: string;
  quantity: number;
  totalAmount: number;
  transporterId?: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: DeliveryStatus }> = [
  { label: 'Assigned', value: 'assigned' },
  { label: 'Loaded', value: 'loaded' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
];

const normalizeDeliveries = (raw: any[]): DeliveryItem[] => {
  return raw.map((delivery) => ({
    id: String(delivery.id),
    cropName: String(delivery.crop_name || 'Unknown Crop'),
    buyerName: String(delivery.buyer_name || 'Unknown Buyer'),
    buyerLocation: delivery.buyer_location ? String(delivery.buyer_location) : undefined,
    status: String(delivery.status || 'assigned'),
    quantity: Number(delivery.quantity ?? 0),
    totalAmount: Number(delivery.total_amount ?? 0),
    transporterId: delivery.transporter_id ? String(delivery.transporter_id) : undefined,
  }));
};

const statusVariant = (
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const value = status.toLowerCase();
  if (value === 'delivered') return 'success';
  if (value === 'loaded' || value === 'assigned') return 'warning';
  if (value === 'in-transit') return 'info';
  return 'default';
};

export default function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [newStatus, setNewStatus] = useState<DeliveryStatus>('assigned');
  const [saving, setSaving] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await api.get('/agent/deliveries')) as any[];
      setDeliveries(normalizeDeliveries(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDeliveries();
    }, [fetchDeliveries])
  );

  const selectedDeliveryStatus = useMemo(() => selectedDelivery?.status || 'assigned', [selectedDelivery]);

  const updateStatus = async () => {
    if (!selectedDelivery) return;

    try {
      setSaving(true);
      setError(null);

      try {
        await api.put(`/agent/deliveries/${selectedDelivery.id}/status`, {
          status: newStatus,
        });
      } catch {
        await api.put(`/agent/deliveries/${selectedDelivery.id}`, {
          status: newStatus,
        });
      }

      setSelectedDelivery(null);
      await fetchDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading deliveries..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Deliveries" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No deliveries assigned yet.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.cardTopRow}>
                <Text style={styles.title}>{item.cropName}</Text>
                <StatusBadge status={item.status as any} />
              </View>

              <Text style={styles.metaText}>Buyer: {item.buyerName}</Text>
              <Text style={styles.metaText}>Location: {item.buyerLocation || 'N/A'}</Text>
              <Text style={styles.metaText}>Quantity: {item.quantity}</Text>
              <Text style={styles.amountText}>
                Amount: ₹{item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>

              <View style={styles.actionRow}>
                <Button
                  title="Update Status"
                  onPress={() => {
                    setSelectedDelivery(item);
                    setNewStatus(item.status as DeliveryStatus);
                  }}
                  variant="primary"
                  size="sm"
                />
              </View>
            </CardContent>
          </Card>
        )}
      />

      <Modal
        transparent
        animationType="slide"
        visible={Boolean(selectedDelivery)}
        onRequestClose={() => setSelectedDelivery(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedDelivery(null)} />
          {selectedDelivery ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Update Status</Text>
              <Text style={styles.modalMeta}>Crop: {selectedDelivery.cropName}</Text>

              <View style={styles.statusChipRow}>
                {STATUS_OPTIONS.map((option) => {
                  const active = newStatus === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setNewStatus(option.value)}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedDelivery(null)}
                  variant="outline"
                  size="md"
                  disabled={saving}
                  style={styles.modalBtn}
                />
                <Button
                  title="Confirm"
                  onPress={() => {
                    void updateStatus();
                  }}
                  variant="primary"
                  size="md"
                  disabled={saving}
                  loading={saving}
                  style={styles.modalBtn}
                />
              </View>

              <Text style={styles.currentStatusText}>Current: {selectedDeliveryStatus}</Text>
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
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
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
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusChipTextActive: {
    color: Colors.surface,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
  },
  currentStatusText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
