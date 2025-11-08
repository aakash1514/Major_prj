import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Truck, CheckCircle, Calendar, DollarSign, User,
  Package, Clock, MapPin, Eye, X, Send, Upload, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';

interface Order {
  id: string;
  buyer_id: string;
  crop_id: string;
  crop_name: string;
  buyer_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  advance_amount: number;
  quantity: number;
  transporter_id: string | null;
  created_at: string;
  updated_at: string;
}

export const Deliveries: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Delivery completion form states
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Fetch agent's deliveries on mount
  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoadingOrders(true);
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:5000/api/agent/my-deliveries', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch deliveries:', response.status);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Start transit - change status from 'assigned' to 'in-transit'
  const handleStartTransit = async (orderId: string) => {
    try {
      setLoadingAction(orderId);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'in-transit' })
      });

      if (response.ok) {
        console.log('✅ Transit started successfully');
        fetchDeliveries(); // Refresh
      } else {
        alert('Failed to start transit');
      }
    } catch (error) {
      console.error('Error starting transit:', error);
      alert('Error starting transit');
    } finally {
      setLoadingAction(null);
    }
  };

  // Complete delivery - change status from 'in-transit' to 'delivered'
  const handleCompleteDelivery = async (orderId: string) => {
    if (!deliveryNotes.trim()) {
      alert('Please add delivery notes');
      return;
    }

    try {
      setLoadingAction(orderId);
      const token = localStorage.getItem('token');

      // For now, we'll just send the notes. Photo upload can be added later if needed
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'delivered',
          deliveryNotes: deliveryNotes
        })
      });

      if (response.ok) {
        console.log('✅ Delivery completed successfully');
        fetchDeliveries(); // Refresh
        setSelectedOrder(null);
        setDeliveryNotes('');
        setDeliveryPhoto(null);
        setPhotoPreview('');
      } else {
        alert('Failed to complete delivery');
      }
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Error completing delivery');
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDeliveryPhoto(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter and sort
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.crop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const stats = {
    total: orders.length,
    assigned: orders.filter(o => o.status === 'assigned').length,
    inTransit: orders.filter(o => o.status === 'in-transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  const selectedOrderData = selectedOrder ? orders.find(o => o.id === selectedOrder) : null;

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-gray-600 mt-1">Track and manage assigned orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, color: 'blue' },
          { label: 'Assigned', value: stats.assigned, color: 'amber' },
          { label: 'In Transit', value: stats.inTransit, color: 'purple' },
          { label: 'Delivered', value: stats.delivered, color: 'green' }
        ].map(stat => (
          <Card key={stat.label} className={`border-l-4 border-${stat.color}-500`}>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                icon={<Search size={16} />}
                placeholder="Search by crop, order ID, or buyer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in-transit', label: 'In Transit' },
                { value: 'delivered', label: 'Delivered' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48"
            />
            <Select
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'amount', label: 'Amount High-Low' },
                { value: 'status', label: 'Status' }
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
          {sortedOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-sm">Crop</p>
                          <p className="font-semibold text-gray-900">{order.crop_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Order ID</p>
                          <p className="font-mono text-sm font-medium">{order.id.substring(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Buyer</p>
                          <p className="font-medium">{order.buyer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Amount</p>
                          <p className="font-semibold text-green-700">${order.total_amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-start lg:items-end gap-3">
                      <StatusBadge status={order.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order.id)}
                      >
                        <Eye size={14} className="mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No deliveries assigned yet</p>
            <p className="text-gray-500 text-sm mt-1">Check back when admin assigns you orders</p>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      {selectedOrderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Delivery Details</h2>
                  <p className="text-gray-600">#{selectedOrderData.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setDeliveryNotes('');
                    setDeliveryPhoto(null);
                    setPhotoPreview('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Crop:</span>
                      <span className="font-medium">{selectedOrderData.crop_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Buyer:</span>
                      <span className="font-medium">{selectedOrderData.buyer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium">{selectedOrderData.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Amount:</span>
                      <span className="font-semibold text-green-700">${selectedOrderData.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Advance Paid:</span>
                      <span className="font-medium">${selectedOrderData.advance_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <StatusBadge status={selectedOrderData.status} />
                    </div>
                  </div>
                </div>

                {/* Delivery Status Actions */}
                {selectedOrderData.status === 'assigned' && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-3">Start Pickup & Transit</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Click the button below to mark this order as in-transit.
                    </p>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => handleStartTransit(selectedOrderData.id)}
                      disabled={loadingAction === selectedOrderData.id}
                    >
                      {loadingAction === selectedOrderData.id ? (
                        <>
                          <Truck size={14} className="mr-2 animate-spin" />
                          Starting Transit...
                        </>
                      ) : (
                        <>
                          <Truck size={14} className="mr-2" />
                          Start Transit
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {selectedOrderData.status === 'in-transit' && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-3">Complete Delivery</h3>
                    <div className="space-y-4">
                      {/* Delivery Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MessageSquare size={14} className="inline mr-2" />
                          Delivery Notes
                        </label>
                        <Textarea
                          placeholder="Describe the condition of the product, any issues, or special notes..."
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Please provide details about the delivery condition and any relevant information.
                        </p>
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Upload size={14} className="inline mr-2" />
                          Proof of Delivery (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="photo-input"
                          />
                          <label htmlFor="photo-input" className="cursor-pointer">
                            {photoPreview ? (
                              <div>
                                <img src={photoPreview} alt="Preview" className="h-32 w-32 mx-auto object-cover rounded" />
                                <p className="text-sm text-gray-600 mt-2">Click to change photo</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Click to upload photo or take a picture</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        variant="success"
                        fullWidth
                        onClick={() => handleCompleteDelivery(selectedOrderData.id)}
                        disabled={loadingAction === selectedOrderData.id || !deliveryNotes.trim()}
                      >
                        {loadingAction === selectedOrderData.id ? (
                          <>
                            <CheckCircle size={14} className="mr-2 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} className="mr-2" />
                            Complete Delivery
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedOrderData.status === 'delivered' && (
                  <div className="border-t pt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">
                      ✅ This order has been delivered successfully!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
