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
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';

type OrderFilter = 'all' | 'pending' | 'confirmed' | 'in-transit' | 'delivered';

interface AdminOrder {
  id: string;
  status: string;
  buyerName: string;
  cropName: string;
  totalAmount: number;
  transporterId?: string;
  createdAt: string;
}

const FILTERS: Array<{ label: string; value: OrderFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
];

const normalizeOrders = (raw: any[]): AdminOrder[] => {
  return raw.map((order) => ({
    id: String(order.id),
    status: String(order.status || 'pending'),
    buyerName: String(order.buyer_name || 'Unknown Buyer'),
    cropName: String(order.crop_name || 'Unknown Crop'),
    totalAmount: Number(order.total_amount ?? 0),
    transporterId: order.transporter_id ? String(order.transporter_id) : undefined,
    createdAt: String(order.created_at || new Date().toISOString()),
  }));
};

const statusVariant = (
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const value = status.toLowerCase();
  if (value === 'delivered') return 'success';
  if (value === 'pending') return 'warning';
  if (value === 'cancelled' || value === 'rejected') return 'danger';
  if (value === 'in-transit' || value === 'assigned' || value === 'confirmed') return 'info';
  return 'default';
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [transporterId, setTransporterId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await api.get('/admin/orders')) as any[];
      setOrders(normalizeOrders(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchOrders();
    }, [fetchOrders])
  );

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status.toLowerCase().replace(/\s+/g, '-') === filter);
  }, [filter, orders]);

  const openAssignModal = (order: AdminOrder) => {
    setSelectedOrder(order);
    setTransporterId(order.transporterId || '');
  };

  const assignTransporter = async () => {
    if (!selectedOrder) return;
    if (!transporterId.trim()) {
      setError('Transporter ID is required');
      return;
    }

    try {
      setAssignLoading(true);
      setError(null);

      await api.put(`/admin/orders/${selectedOrder.id}/assign-transporter`, {
        transporterId: transporterId.trim(),
      });

      setSelectedOrder(null);
      setTransporterId('');
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign transporter');
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="All Orders" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
      >
        {FILTERS.map((item) => {
          const active = item.value === filter;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No orders found for this status.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.orderCard}>
            <CardContent>
              <View style={styles.cardTopRow}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
                <Badge
                  label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  variant={statusVariant(item.status)}
                />
              </View>

              <Text style={styles.metaText}>Buyer: {item.buyerName}</Text>
              <Text style={styles.metaText}>Crop: {item.cropName}</Text>
              <Text style={styles.amountText}>
                ₹{item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.metaText}>
                Date: {new Date(item.createdAt).toLocaleDateString('en-IN')}
              </Text>
              <Text style={styles.metaText}>
                Transporter: {item.transporterId || 'Not assigned'}
              </Text>

              <View style={styles.actionRow}>
                <Button
                  title="Assign Transporter"
                  onPress={() => openAssignModal(item)}
                  variant="outline"
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
        visible={Boolean(selectedOrder)}
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedOrder(null)} />
          {selectedOrder ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Assign Transporter</Text>
              <Text style={styles.modalMeta}>Order #{selectedOrder.id}</Text>
              <Text style={styles.modalMeta}>Crop: {selectedOrder.cropName}</Text>

              <Input
                label="Transporter ID"
                value={transporterId}
                onChangeText={setTransporterId}
                placeholder="Enter transporter user id"
              />

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedOrder(null)}
                  variant="outline"
                  size="md"
                  style={styles.modalBtn}
                  disabled={assignLoading}
                />
                <Button
                  title="Assign"
                  onPress={() => {
                    void assignTransporter();
                  }}
                  variant="primary"
                  size="md"
                  style={styles.modalBtn}
                  loading={assignLoading}
                  disabled={assignLoading}
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
  filterScroll: {
    maxHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 8,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.surface,
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  actionRow: {
    marginTop: 8,
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
    marginBottom: 4,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
  },
});
