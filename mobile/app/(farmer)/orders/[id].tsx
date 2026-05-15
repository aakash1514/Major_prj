import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../utils/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import StatusBadge from '../../../components/ui/StatusBadge';
import { Colors } from '../../../constants/Colors';
import { Order } from '../../../types';

const normalizeOrder = (order: any): Order => {
  return {
    id: String(order.id),
    buyerId: String(order.buyer_id || order.buyerId || ''),
    cropId: String(order.crop_id || order.cropId || ''),
    status: (order.status || 'pending') as Order['status'],
    paymentStatus: (order.payment_status || order.paymentStatus || 'pending') as Order['paymentStatus'],
    advanceAmount: Number(order.advance_amount ?? order.advanceAmount ?? 0),
    totalAmount: Number(order.total_amount ?? order.totalAmount ?? 0),
    createdAt: new Date(order.created_at || order.createdAt || Date.now()),
    transporterId: order.transporter_id || order.transporterId || undefined,
  };
};

export default function FarmerOrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/orders/${id}`);
      setOrder(normalizeOrder(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return <LoadingSpinner message="Loading order..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <ScreenHeader
            title="Order Details"
            rightAction={{
              label: 'X',
              onPress: () => {
                router.replace('/(farmer)/orders');
              },
            }}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {order ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Card>
                <CardContent style={styles.headerContent}>
                  <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
                  <StatusBadge status={order.status as any} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Text style={styles.sectionTitle}>Payment</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text style={styles.detailValue}>
                      ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Advance</Text>
                    <Text style={styles.detailValue}>
                      ₹{Number(order.advanceAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Status</Text>
                    <Badge label={order.paymentStatus} variant="info" />
                  </View>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Text style={styles.sectionTitle}>Order Info</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Crop ID</Text>
                    <Text style={styles.detailValue}>{order.cropId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Buyer ID</Text>
                    <Text style={styles.detailValue}>{order.buyerId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </Text>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
});
