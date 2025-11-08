import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Clock, CheckCircle, Truck, DollarSign, 
  Eye, MessageCircle, Calendar, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';

interface FarmerOrder {
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
}

export const Orders: React.FC = () => {
  const { user } = useAuthStore();
  const [farmerOrders, setFarmerOrders] = useState<FarmerOrder[]>([]);
  const [cropInfo, setCropInfo] = useState<Map<string, CropInfo>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch orders on mount
  useEffect(() => {
    if (user) {
      fetchFarmerOrders();
    }
  }, [user]);

  const fetchFarmerOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/farmer/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch orders:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📥 Fetched farmer orders:', data);
      setFarmerOrders(Array.isArray(data) ? data : data.orders || []);

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

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (!response.ok) {
        console.error('Failed to confirm order:', response.status);
        return;
      }

      console.log('✅ Order confirmed');
      // Refresh orders list
      fetchFarmerOrders();
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  // Apply filters
  const filteredOrders = farmerOrders.filter(order => {
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
      total: farmerOrders.length,
      pending: farmerOrders.filter(o => o.status === 'pending').length,
      confirmed: farmerOrders.filter(o => o.status === 'confirmed').length,
      inTransit: farmerOrders.filter(o => o.status === 'in-transit').length,
      delivered: farmerOrders.filter(o => o.status === 'delivered').length,
      totalRevenue: farmerOrders.reduce((sum, order) => sum + order.total_amount, 0),
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
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Track and manage orders for your crops</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Package className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Confirmed</p>
                <p className="text-xl font-bold">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Truck className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-xl font-bold">{stats.inTransit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                <DollarSign className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
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
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.id.substring(0, 8)}
                            </h3>
                            <p className="text-gray-600">{crop?.name || 'Unknown Crop'}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                      <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-40">
                        {order.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle size={14} />}
                            onClick={() => handleConfirmOrder(order.id)}
                            fullWidth
                          >
                            Confirm Order
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
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<MessageCircle size={14} />}
                          onClick={() => console.log('Contact buyer for order:', order.id)}
                          fullWidth
                        >
                          Contact Buyer
                        </Button>
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
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
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
                : "You don't have any orders yet. Orders will appear here when buyers purchase your crops."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Order Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-md">
              <div className="flex-shrink-0 pt-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  New order received for <span className="font-medium">Organic Wheat</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
              <Badge variant="info">New</Badge>
            </div>
            
            <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md">
              <div className="flex-shrink-0 pt-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  Order <span className="font-medium">#12345</span> has been delivered
                </p>
                <p className="text-xs text-gray-500 mt-1">1 day ago</p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
            
            <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md">
              <div className="flex-shrink-0 pt-1">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  Payment received for <span className="font-medium">Fresh Tomatoes</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">2 days ago</p>
              </div>
              <Badge variant="warning">Payment</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};