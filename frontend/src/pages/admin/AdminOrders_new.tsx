import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Eye, Package, Truck, CheckCircle, 
  Calendar, DollarSign, User, Settings, X, Send
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';

interface Agent {
  id: string;
  name: string;
  email: string;
  contact_number: string;
}

interface Order {
  id: string;
  buyer_id: string;
  crop_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  advance_amount: number;
  quantity: number;
  transporter_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Crop {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  harvest_date: string;
  farmer_id: string;
  status: string;
  images?: string[];
}

export const AdminOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoadingOrders(true);
      const token = localStorage.getItem('token');

      // Fetch all orders
      const ordersRes = await fetch('http://localhost:5000/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      // Fetch all crops
      const cropsRes = await fetch('http://localhost:5000/api/crops', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cropsRes.ok) {
        const cropsData = await cropsRes.json();
        setCrops(cropsData);
      }

      // Fetch agents
      const agentsRes = await fetch('http://localhost:5000/api/agent/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAssignTransporter = async (orderId: string, agentId: string) => {
    if (!agentId) {
      alert('Please select an agent');
      return;
    }

    try {
      setAssigningOrder(orderId);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'assigned',
          transporter_id: agentId
        })
      });

      if (response.ok) {
        console.log('✅ Transporter assigned successfully');
        fetchAllData(); // Refresh
        setSelectedAgent('');
      } else {
        alert('Failed to assign transporter');
      }
    } catch (error) {
      console.error('Error assigning transporter:', error);
      alert('Error assigning transporter');
    } finally {
      setAssigningOrder(null);
    }
  };

  // Filter and sort
  const filteredOrders = orders.filter(order => {
    const crop = crops.find(c => c.id === order.crop_id);
    const matchesSearch =
      crop?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_id.toLowerCase().includes(searchTerm.toLowerCase());
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
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    inTransit: orders.filter(o => o.status === 'in-transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalValue: orders.reduce((sum, o) => sum + o.total_amount, 0)
  };

  const selectedOrderData = selectedOrder ? orders.find(o => o.id === selectedOrder) : null;
  const selectedCrop = selectedOrderData ? crops.find(c => c.id === selectedOrderData.crop_id) : null;
  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage all marketplace orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, color: 'blue' },
          { label: 'Pending', value: stats.pending, color: 'amber' },
          { label: 'Confirmed', value: stats.confirmed, color: 'green' },
          { label: 'In Transit', value: stats.inTransit, color: 'purple' },
          { label: 'Delivered', value: stats.delivered, color: 'emerald' },
          { label: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, color: 'indigo' }
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className={`text-2xl font-bold text-${stat.color}-700`}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search orders, crops, or buyers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                fullWidth
              />
            </div>

            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
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
          {sortedOrders.map((order, index) => {
            const crop = crops.find(c => c.id === order.crop_id);
            const transporter = order.transporter_id ? agents.find(a => a.id === order.transporter_id) : null;

            return (
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
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.id.substring(0, 8)}
                            </h3>
                            <p className="text-gray-600">{crop?.name || 'Unknown Crop'}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Amount</p>
                              <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Date</p>
                              <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Buyer</p>
                              <p className="font-medium">{order.buyer_id.substring(0, 8)}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-gray-500">Payment</p>
                              <Badge
                                variant={order.payment_status === 'fully-paid' ? 'success' : 'warning'}
                              >
                                {order.payment_status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {transporter && order.status === 'assigned' && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Assigned to:</strong> {transporter.name} ({transporter.email})
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row lg:flex-col gap-2 lg:w-32">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order.id)}
                          fullWidth
                        >
                          <Eye size={14} className="mr-1" />
                          Manage
                        </Button>
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
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}

      {/* Order Management Modal */}
      {selectedOrder && selectedOrderData && selectedCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
                  <p className="text-gray-600">#{selectedOrderData.id}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Order Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order ID:</span>
                        <span className="font-medium">{selectedOrderData.id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Crop:</span>
                        <span className="font-medium">{selectedCrop.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Buyer:</span>
                        <span className="font-medium">{selectedOrderData.buyer_id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">{new Date(selectedOrderData.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Amount:</span>
                        <span className="font-semibold text-green-700">${selectedOrderData.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <StatusBadge status={selectedOrderData.status} />
                      </div>
                    </div>
                  </div>

                  {/* Transporter Assignment */}
                  {selectedOrderData.status === 'confirmed' && (
                    <div className="border-t pt-6">
                      <h3 className="font-medium text-gray-900 mb-3">Assign Transporter</h3>
                      <div className="space-y-3">
                        <Select
                          label="Select Agent"
                          options={agents.map(a => ({
                            value: a.id,
                            label: `${a.name} - ${a.email}`
                          }))}
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          fullWidth
                        />

                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => handleAssignTransporter(selectedOrderData.id, selectedAgent)}
                          disabled={!selectedAgent || assigningOrder === selectedOrderData.id}
                        >
                          {assigningOrder === selectedOrderData.id ? (
                            <>
                              <Package size={14} className="mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <Send size={14} className="mr-2" />
                              Assign Transporter
                            </>
                          )}
                        </Button>

                        {selectedAgentData && (
                          <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            <p className="text-blue-800">
                              <strong>Selected:</strong> {selectedAgentData.name}
                              <br />
                              <strong>Email:</strong> {selectedAgentData.email}
                              <br />
                              <strong>Contact:</strong> {selectedAgentData.contact_number}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrderData.status === 'assigned' && (
                    <div className="border-t pt-6 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 text-sm font-medium">
                        ✅ Order assigned to transporter. Waiting for pickup...
                      </p>
                    </div>
                  )}
                </div>

                {/* Crop Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Crop Details</h3>
                    <div className="flex items-start space-x-4">
                      {selectedCrop.images && selectedCrop.images[0] && (
                        <img
                          src={selectedCrop.images[0]}
                          alt={selectedCrop.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{selectedCrop.name}</h4>
                        <p className="text-gray-600 text-sm">{selectedCrop.description}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Quantity:</span>
                            <span className="font-medium">{selectedCrop.quantity} {selectedCrop.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Price:</span>
                            <span className="font-medium">${selectedCrop.price} / {selectedCrop.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Harvest:</span>
                            <span className="font-medium">{new Date(selectedCrop.harvest_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge
                          variant={selectedOrderData.payment_status === 'fully-paid' ? 'success' : 'warning'}
                        >
                          {selectedOrderData.payment_status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      {selectedOrderData.advance_amount && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Advance Paid:</span>
                            <span className="font-medium">${selectedOrderData.advance_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Balance Due:</span>
                            <span className="font-medium">
                              ${(selectedOrderData.total_amount - selectedOrderData.advance_amount).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
