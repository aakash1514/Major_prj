import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';

type OrderFilter = 'all' | 'pending' | 'confirmed' | 'in-transit' | 'delivered';
type OrderStatus = 'pending' | 'confirmed' | 'assigned' | 'in-transit' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'advance-paid' | 'fully-paid';

interface AdminOrder {
  id: string;
  status: string;
  paymentStatus?: string;
  paidToFarmer?: boolean;
  farmerPaidAt?: string;
  deliveryNotes?: string;
  deliveryProof?: string;
  buyerName: string;
  cropName: string;
  totalAmount: number;
  transporterId?: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
}

const FILTERS: Array<{ label: string; value: OrderFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
];

const STATUS_OPTIONS: Array<{ label: string; value: OrderStatus }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In-Transit', value: 'in-transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAYMENT_OPTIONS: Array<{ label: string; value: PaymentStatus }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Advance Paid', value: 'advance-paid' },
  { label: 'Fully Paid', value: 'fully-paid' },
];

const normalizeOrders = (raw: any[]): AdminOrder[] => {
  return raw.map((order) => ({
    id: String(order.id),
    status: String(order.status || 'pending'),
    paymentStatus: order.payment_status
      ? String(order.payment_status)
      : order.paymentStatus
      ? String(order.paymentStatus)
      : undefined,
    paidToFarmer: Boolean(order.paid_to_farmer ?? order.paidToFarmer ?? false),
    farmerPaidAt: order.farmer_paid_at
      ? String(order.farmer_paid_at)
      : order.farmerPaidAt
      ? String(order.farmerPaidAt)
      : undefined,
    deliveryNotes: order.delivery_notes
      ? String(order.delivery_notes)
      : order.deliveryNotes
      ? String(order.deliveryNotes)
      : undefined,
    deliveryProof: order.delivery_proof
      ? String(order.delivery_proof)
      : order.deliveryProof
      ? String(order.deliveryProof)
      : undefined,
    buyerName: String(order.buyer_name || 'Unknown Buyer'),
    cropName: String(order.crop_name || 'Unknown Crop'),
    totalAmount: Number(order.total_amount ?? 0),
    transporterId: order.transporter_id ? String(order.transporter_id) : undefined,
    createdAt: String(order.created_at || new Date().toISOString()),
  }));
};

const normalizeAgents = (raw: any[]): Agent[] => {
  return raw.map((agent) => ({
    id: String(agent.id),
    name: String(agent.name || 'Agent'),
    email: String(agent.email || ''),
    contactNumber: agent.contact_number ? String(agent.contact_number) : undefined,
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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminOrder | null>(null);
  const [transporterId, setTransporterId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('pending');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

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

  const fetchAgents = useCallback(async () => {
    try {
      setAgentsLoading(true);
      const data = (await api.get('/agent/list')) as any[];
      setAgents(normalizeAgents(Array.isArray(data) ? data : []));
    } catch (err) {
      setAgents([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchOrders();
      void fetchAgents();
    }, [fetchOrders, fetchAgents])
  );

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status.toLowerCase().replace(/\s+/g, '-') === filter);
  }, [filter, orders]);

  const openAssignModal = (order: AdminOrder) => {
    setSelectedOrder(order);
    setTransporterId(order.transporterId || '');
  };

  const openDetailsModal = (order: AdminOrder) => {
    setSelectedOrderDetails(order);
    setNewStatus((order.status || 'pending') as OrderStatus);
    setNewPaymentStatus((order.paymentStatus || 'pending') as PaymentStatus);
  };

  const assignTransporter = async () => {
    if (!selectedOrder) return;
    if (!transporterId.trim()) {
      setError('Select a transporter');
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

  const settleFarmer = async (order: AdminOrder) => {
    Alert.alert(
      'Mark farmer settled',
      'Confirm that the farmer has been paid for this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setSettleLoading(true);
              setError(null);
              await api.put(`/orders/${order.id}/settle-farmer`, {
                note: `Settlement marked by admin for order ${order.id}`,
              });
              setSelectedOrderDetails(null);
              await fetchOrders();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to mark settlement');
            } finally {
              setSettleLoading(false);
            }
          },
        },
      ]
    );
  };

  const updateOrderStatus = async (order: AdminOrder) => {
    try {
      setStatusLoading(true);
      setError(null);
      await api.put(`/orders/${order.id}/status`, {
        status: newStatus,
      });
      setSelectedOrderDetails(null);
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setStatusLoading(false);
    }
  };

  const updatePaymentStatus = async (order: AdminOrder) => {
    try {
      setPaymentLoading(true);
      setError(null);
      await api.put(`/orders/${order.id}/payment`, {
        paymentStatus: newPaymentStatus,
      });
      setSelectedOrderDetails(null);
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  const selectedAgent = agents.find((agent) => agent.id === transporterId) || null;

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
          <TouchableOpacity activeOpacity={0.82} onPress={() => openDetailsModal(item)}>
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

                {['confirmed', 'assigned'].includes(item.status.toLowerCase()) ? (
                  <View style={styles.actionRow}>
                    <Button
                      title={item.transporterId ? 'Change Transporter' : 'Assign Transporter'}
                      onPress={() => openAssignModal(item)}
                      variant="outline"
                      size="sm"
                    />
                  </View>
                ) : null}
              </CardContent>
            </Card>
          </TouchableOpacity>
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

              <Text style={styles.modalLabel}>Select Agent</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={transporterId}
                  onValueChange={(value) => setTransporterId(String(value))}
                  enabled={!agentsLoading}
                  dropdownIconColor={Colors.textSecondary}
                >
                  <Picker.Item
                    label={agentsLoading ? 'Loading agents...' : 'Select transporter'}
                    value=""
                  />
                  {agents.map((agent) => (
                    <Picker.Item
                      key={agent.id}
                      label={`${agent.name} - ${agent.email}`}
                      value={agent.id}
                    />
                  ))}
                </Picker>
              </View>

              {selectedAgent ? (
                <View style={styles.agentCard}>
                  <Text style={styles.agentText}>Name: {selectedAgent.name}</Text>
                  <Text style={styles.agentText}>Email: {selectedAgent.email}</Text>
                  {selectedAgent.contactNumber ? (
                    <Text style={styles.agentText}>Contact: {selectedAgent.contactNumber}</Text>
                  ) : null}
                </View>
              ) : null}

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

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(selectedOrderDetails)}
        onRequestClose={() => setSelectedOrderDetails(null)}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity
            style={styles.detailBackdrop}
            onPress={() => setSelectedOrderDetails(null)}
          />
          {selectedOrderDetails ? (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Order Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedOrderDetails(null)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>X</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailBody}>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Order</Text>
                  <Text style={styles.detailValue}>#{selectedOrderDetails.id.slice(0, 8)}</Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Badge
                    label={selectedOrderDetails.status.charAt(0).toUpperCase() + selectedOrderDetails.status.slice(1)}
                    variant={statusVariant(selectedOrderDetails.status)}
                  />
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrderDetails.paymentStatus
                      ? selectedOrderDetails.paymentStatus.charAt(0).toUpperCase() +
                        selectedOrderDetails.paymentStatus.slice(1)
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Farmer Settlement</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrderDetails.paidToFarmer ? 'Completed' : 'Pending'}
                  </Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Buyer</Text>
                  <Text style={styles.detailValue}>{selectedOrderDetails.buyerName}</Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Crop</Text>
                  <Text style={styles.detailValue}>{selectedOrderDetails.cropName}</Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    ₹{selectedOrderDetails.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrderDetails.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <View style={styles.detailRowInline}>
                  <Text style={styles.detailLabel}>Transporter</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrderDetails.transporterId || 'Not assigned'}
                  </Text>
                </View>

                {selectedOrderDetails.deliveryNotes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesLabel}>Delivery Notes</Text>
                    <Text style={styles.notesText}>{selectedOrderDetails.deliveryNotes}</Text>
                  </View>
                ) : null}

                {selectedOrderDetails.deliveryProof ? (
                  <View style={styles.proofBlock}>
                    <Text style={styles.notesLabel}>Delivery Proof</Text>
                    <Image
                      source={{ uri: selectedOrderDetails.deliveryProof }}
                      style={styles.proofImage}
                    />
                  </View>
                ) : null}

                {selectedOrderDetails.status.toLowerCase() !== 'delivered' ? (
                  <>
                    <Text style={styles.detailSectionTitle}>Update Status</Text>
                    <View style={styles.pickerShell}>
                      <Picker
                        selectedValue={newStatus}
                        onValueChange={(value) => setNewStatus(value as OrderStatus)}
                        dropdownIconColor={Colors.textSecondary}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </View>
                    <Button
                      title={statusLoading ? 'Updating...' : 'Update Status'}
                      onPress={() => {
                        void updateOrderStatus(selectedOrderDetails);
                      }}
                      variant="outline"
                      size="md"
                      loading={statusLoading}
                      disabled={statusLoading}
                      style={styles.statusButton}
                    />

                    <Text style={styles.detailSectionTitle}>Update Payment</Text>
                    <View style={styles.pickerShell}>
                      <Picker
                        selectedValue={newPaymentStatus}
                        onValueChange={(value) => setNewPaymentStatus(value as PaymentStatus)}
                        dropdownIconColor={Colors.textSecondary}
                      >
                        {PAYMENT_OPTIONS.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </View>
                    <Button
                      title={paymentLoading ? 'Updating...' : 'Update Payment'}
                      onPress={() => {
                        void updatePaymentStatus(selectedOrderDetails);
                      }}
                      variant="outline"
                      size="md"
                      loading={paymentLoading}
                      disabled={paymentLoading}
                      style={styles.statusButton}
                    />
                  </>
                ) : null}

                {selectedOrderDetails.paymentStatus === 'fully-paid' &&
                !selectedOrderDetails.paidToFarmer ? (
                  <Button
                    title={settleLoading ? 'Marking...' : 'Mark Farmer Settled'}
                    onPress={() => {
                      void settleFarmer(selectedOrderDetails);
                    }}
                    variant="primary"
                    size="md"
                    loading={settleLoading}
                    disabled={settleLoading}
                    style={styles.settleButton}
                  />
                ) : null}
              </ScrollView>
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
  modalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '600',
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  agentCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#cfe3ff',
  },
  agentText: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  detailHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  detailBody: {
    padding: 16,
    gap: 10,
  },
  detailRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  notesBlock: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  notesLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  proofBlock: {
    marginTop: 8,
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 6,
  },
  detailSectionTitle: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  settleButton: {
    marginTop: 8,
  },
  statusButton: {
    marginTop: 8,
  },
});
