import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../utils/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { Order } from '../../types';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'in-transit' | 'delivered';

const STATUS_FILTERS: { label: string; value: OrderStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
];

const getPaymentStatusVariant = (paymentStatus: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (paymentStatus?.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
};

const OrderCard: React.FC<{ order: Order; onPress?: () => void }> = ({ order, onPress }) => {
  const createdDate = new Date(order.createdAt);
  const dateStr = createdDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const content = (
    <Card style={styles.orderCard}>
      <CardContent style={styles.orderCardContent}>
        {/* Header Row: Crop name and Order Status */}
        <View style={styles.headerRow}>
          <View style={styles.cropInfo}>
            <Text style={styles.cropName}>{order.cropId || 'Unknown Crop'}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <StatusBadge status={order.status as any} />
        </View>

        {/* Details Row: Buyer and Quantity */}
        <View style={styles.detailsRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Buyer</Text>
            <Text style={styles.detailValue}>Buyer</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>Qty</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Payment Status Badge */}
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <Badge
            variant={getPaymentStatusVariant(order.paymentStatus)}
            label={order.paymentStatus || 'Pending'}
          />
        </View>
      </CardContent>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

export default function FarmerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void fetchOrders();
    }, [])
  );

  const normalizeOrders = (raw: any[]): Order[] => {
    return raw.map((order) => ({
      id: String(order.id),
      buyerId: String(order.buyer_id || order.buyerId || ''),
      cropId: String(order.crop_id || order.cropId || ''),
      status: (order.status || 'pending') as Order['status'],
      paymentStatus: (order.payment_status || order.paymentStatus || 'pending') as Order['paymentStatus'],
      advanceAmount: Number(order.advance_amount ?? order.advanceAmount ?? 0),
      totalAmount: Number(order.total_amount ?? order.totalAmount ?? 0),
      createdAt: new Date(order.created_at || order.createdAt || Date.now()),
      transporterId: order.transporter_id || order.transporterId || undefined,
    }));
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/farmer/orders') as any[];
      setOrders(normalizeOrders(Array.isArray(data) ? data : []));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on selected status
  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') return orders;
    return orders.filter((order) =>
      order.status.toLowerCase().replace(/ /g, '-') === selectedFilter
    );
  }, [orders, selectedFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Orders" />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={fetchOrders}
            variant="outline"
            size="sm"
            style={styles.retryButton}
          />
        </View>
      )}

      {/* Status Filter Buttons */}
      {orders.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedFilter === filter.value && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter.value && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Empty State */}
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            When buyers place orders for your crops, they will appear here
          </Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>
            Try selecting a different status filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(farmer)/orders/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.surface,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  orderCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
