import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Clock, CheckCircle, Truck, DollarSign, 
  Eye, X, Calendar, User, CreditCard
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { createOrderPayment, verifyOrderPayment } from '../../api/payment';

interface BuyerOrder {
  id: string;
  buyer_id: string;
  crop_id: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'in-transit' | 'delivered';
  payment_status: 'pending' | 'advance-paid' | 'fully-paid';
  advance_amount: number;
  total_amount: number;
  quantity: number;
  transporter_id?: string;
  created_at: string;
  updated_at: string;
}

interface CropInfo {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  farmer_id?: string;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayFailurePayload {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: 'payment.failed', handler: (payload: RazorpayFailurePayload) => void) => void;
    };
  }
}

export const MyOrders: React.FC = () => {
  const { user } = useAuthStore();
  const [buyerOrders, setBuyerOrders] = useState<BuyerOrder[]>([]);
  const [cropInfo, setCropInfo] = useState<Map<string, CropInfo>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isPaying, setIsPaying] = useState<string | null>(null);

  const razorpayKey =
    import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_Reli2JwWcxfYe5';

  // Fetch orders on mount
  useEffect(() => {
    if (user) {
      fetchBuyerOrders();
    }
  }, [user]);

  const fetchBuyerOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/buyers/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch orders:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📥 Fetched buyer orders:', data);
      setBuyerOrders(Array.isArray(data) ? data : data.orders || []);

      // Fetch crop info for each order
      for (const order of Array.isArray(data) ? data : data.orders || []) {
        fetchCropInfo(order.crop_id);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchCropInfo = async (cropId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/crops/${cropId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const crop = await response.json();
        setCropInfo(prev => new Map(prev).set(cropId, crop));
      }
    } catch (error) {
      console.error('Error fetching crop info:', error);
    }
  };

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (order: BuyerOrder) => {
    if (order.payment_status === 'fully-paid') {
      return;
    }

    setIsPaying(order.id);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout script');
      }

      const createRes = await createOrderPayment(order.id);
      const paymentOrder = createRes.paymentOrder;

      const checkoutKey = paymentOrder.keyId || razorpayKey;

      const options: RazorpayCheckoutOptions = {
        key: checkoutKey,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'AgriFlow',
        description: `Payment for Order #${order.id.substring(0, 8)}`,
        order_id: paymentOrder.id,
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyOrderPayment(order.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            alert('Payment successful and verified.');
            await fetchBuyerOrders();
          } catch (verifyErr) {
            const message = verifyErr instanceof Error
              ? verifyErr.message
              : 'Payment verification failed';
            alert(message);
          } finally {
            setIsPaying(null);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#ca8a04'
        },
        modal: {
          ondismiss: () => {
            setIsPaying(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (failurePayload: RazorpayFailurePayload) => {
        const failureError = failurePayload?.error;
        const message = failureError?.description
          || failureError?.reason
          || 'Payment failed at Razorpay checkout';

        console.error('[Razorpay payment.failed]', failurePayload);
        alert(message);
        setIsPaying(null);
      });
      razorpay.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initiate payment';
      alert(message);
      setIsPaying(null);
    }
  };

  // Apply filters
  const filteredOrders = buyerOrders.filter(order => {
    const crop = cropInfo.get(order.crop_id);
    const matchesSearch = crop?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.total_amount - a.total_amount;
      case 'status':
        return a.status.localeCompare(b.status);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getOrderStats = () => {
    return {
      total: buyerOrders.length,
      pending: buyerOrders.filter(o => o.status === 'pending').length,
      confirmed: buyerOrders.filter(o => o.status === 'confirmed').length,
      inTransit: buyerOrders.filter(o => o.status === 'in-transit').length,
      delivered: buyerOrders.filter(o => o.status === 'delivered').length,
      totalSpent: buyerOrders.reduce((sum, order) => sum + order.total_amount, 0),
    };
  };

  const stats = getOrderStats();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'in-transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <Package className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-1">Track your crop orders and delivery status</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Orders</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
              <div className="text-sm text-gray-500">Confirmed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{stats.inTransit}</div>
              <div className="text-sm text-gray-500">In Transit</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{stats.delivered}</div>
              <div className="text-sm text-gray-500">Delivered</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700">${stats.totalSpent.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Spent</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              type="text"
              placeholder="Search orders or crops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              fullWidth
            />

            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'in-transit', label: 'In Transit' },
                { value: 'delivered', label: 'Delivered' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48"
            />

            <Select
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'amount', label: 'Amount High-Low' },
                { value: 'status', label: 'Status' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {sortedOrders.length > 0 ? (
        <div className="space-y-4">
          {sortedOrders.map((order, index) => {
            const crop = cropInfo.get(order.crop_id);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.id.substring(0, 8)}
                            </h3>
                            <p className="text-gray-600">{crop?.name || 'Unknown Crop'}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Total Amount</p>
                              <p className="font-semibold">${typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : parseFloat(order.total_amount || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Order Date</p>
                              <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Payment Status</p>
                              <Badge 
                                variant={order.payment_status === 'fully-paid' ? 'success' : 'warning'}
                              >
                                {order.payment_status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {order.advance_amount && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            {(() => {
                              const advanceAmt = typeof order.advance_amount === 'number' ? order.advance_amount : parseFloat(order.advance_amount || 0);
                              const totalAmt = typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || 0);
                              const balance = totalAmt - advanceAmt;
                              return (
                                <p className="text-sm text-green-800">
                                  <strong>Advance Paid:</strong> ${advanceAmt.toFixed(2)} 
                                  <span className="ml-2 text-green-600">
                                    (Balance: ${balance.toFixed(2)})
                                  </span>
                                </p>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col gap-2 lg:w-32">
                        {order.payment_status !== 'fully-paid' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CreditCard size={14} />}
                            onClick={() => handlePayNow(order)}
                            disabled={isPaying === order.id}
                            fullWidth
                          >
                            {isPaying === order.id ? 'Processing...' : 'Pay Now'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => console.log('View order:', order.id)}
                          fullWidth
                        >
                          View Details
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<X size={14} />}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this order?')) {
                                console.log('Cancelling order:', order.id);
                              }
                            }}
                            fullWidth
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Order Progress</span>
                        <span>{order.status.replace('-', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {['pending', 'confirmed', 'in-transit', 'delivered'].map((status, idx) => {
                          const isActive = ['pending', 'confirmed', 'in-transit', 'delivered'].indexOf(order.status) >= idx;
                          const isCurrent = order.status === status;
                          return (
                            <React.Fragment key={status}>
                              <div className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 ${
                                isActive 
                                  ? isCurrent 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-green-600 border-green-600 text-white'
                                  : 'border-gray-300 text-gray-300'
                              }`}>
                                {getStatusIcon(status)}
                              </div>
                              {idx < 3 && (
                                <div className={`flex-1 h-1 ${
                                  ['pending', 'confirmed', 'in-transit', 'delivered'].indexOf(order.status) > idx
                                    ? 'bg-green-600' 
                                    : 'bg-gray-300'
                                }`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : "You haven't placed any orders yet. Browse the marketplace to find fresh crops."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Details Modal - Coming Soon */}
    </div>
  );
};