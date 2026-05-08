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
import { Card, CardContent } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'in-transit' | 'delivered';

interface BuyerOrder {
  id: string;
  cropId: string;
  buyerId: string;
  quantity: number;
  totalAmount: number;
  advanceAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  cropName?: string;
}

const STATUS_FILTERS: Array<{ label: string; value: FilterStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
];

const getPaymentVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'fully-paid' || normalized === 'paid') return 'success';
  if (normalized === 'pending' || normalized === 'advance-paid') return 'warning';
  if (normalized === 'failed') return 'danger';
  return 'info';
};

const normalizeOrders = (raw: any[]): BuyerOrder[] => {
  return raw.map((order) => ({
    id: String(order.id),
    cropId: String(order.crop_id ?? order.cropId ?? ''),
    buyerId: String(order.buyer_id ?? order.buyerId ?? ''),
    quantity: Number(order.quantity ?? 0),
    totalAmount: Number(order.total_amount ?? order.totalAmount ?? 0),
    advanceAmount: Number(order.advance_amount ?? order.advanceAmount ?? 0),
    status: String(order.status ?? 'pending'),
    paymentStatus: String(order.payment_status ?? order.paymentStatus ?? 'pending'),
    createdAt: String(order.created_at ?? order.createdAt ?? new Date().toISOString()),
    cropName: order.crop_name,
  }));
};

export default function BuyerOrdersScreen() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, cropsRes] = await Promise.all([
        api.get('/buyers/orders') as Promise<any[]>,
        api.get('/crops').catch(() => [] as any[]),
      ]);

      const crops = Array.isArray(cropsRes)
        ? cropsRes
        : Array.isArray((cropsRes as { crops?: any[] })?.crops)
        ? (cropsRes as { crops: any[] }).crops
        : [];
      const cropNameMap = new Map<string, string>(
        crops.map((crop) => [String(crop.id), String(crop.name || 'Unknown Crop')])
      );

      const normalized = normalizeOrders(Array.isArray(ordersRes) ? ordersRes : []).map((order) => ({
        ...order,
        cropName: order.cropName || cropNameMap.get(order.cropId) || 'Unknown Crop',
      }));
      setOrders(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
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
    return orders.filter(
      (order) => order.status.toLowerCase().replace(/\s+/g, '-') === filter
    );
  }, [filter, orders]);

  if (loading) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Orders" />

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
        {STATUS_FILTERS.map((item) => {
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
        renderItem={({ item }) => {
          const createdDate = new Date(item.createdAt);
          return (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedOrder(item)}>
              <Card style={styles.orderCard}>
                <CardContent>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderTextWrap}>
                      <Text style={styles.cropName}>{item.cropName || 'Unknown Crop'}</Text>
                      <Text style={styles.dateText}>
                        {createdDate.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <StatusBadge status={item.status as any} />
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Buyer</Text>
                      <Text style={styles.detailValue}>{user?.name || 'You'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>{item.quantity}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.detailValue}>
                        ₹{item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Payment Status</Text>
                    <Badge
                      variant={getPaymentVariant(item.paymentStatus)}
                      label={item.paymentStatus}
                    />
                  </View>
                </CardContent>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={Boolean(selectedOrder)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedOrder(null)} />
          {selectedOrder ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Order Details</Text>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Order ID</Text>
                <Text style={styles.modalValue}>{selectedOrder.id}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Crop</Text>
                <Text style={styles.modalValue}>{selectedOrder.cropName}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Quantity</Text>
                <Text style={styles.modalValue}>{selectedOrder.quantity}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Total Amount</Text>
                <Text style={styles.modalValue}>
                  ₹{selectedOrder.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Advance Amount</Text>
                <Text style={styles.modalValue}>
                  ₹{selectedOrder.advanceAmount.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Status</Text>
                <StatusBadge status={selectedOrder.status as any} />
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Payment</Text>
                <Badge
                  variant={getPaymentVariant(selectedOrder.paymentStatus)}
                  label={selectedOrder.paymentStatus}
                />
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Created</Text>
                <Text style={styles.modalValue}>
                  {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
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
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 8,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  paymentRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
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
    marginBottom: 10,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  closeBtn: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 14,
  },
});
