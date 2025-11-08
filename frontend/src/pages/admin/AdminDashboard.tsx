import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, ShoppingBag, Truck, AlertCircle, 
  CheckCircle2, Clock, BarChart2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface DashboardStats {
  totalUsers: number;
  totalCrops: number;
  totalOrders: number;
  pendingCrops: number;
  approvedCrops: number;
  rejectedCrops: number;
  cropStatusBreakdown: Record<string, number>;
  orderStatusBreakdown: Record<string, number>;
  userRoleBreakdown: Record<string, number>;
  recentCrops: Array<{
    id: string;
    name: string;
    farmer_id: string;
    status: string;
    created_at: string;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    crop_name: string;
    buyer_name: string;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[AdminDashboard] API Response:', data);
      
      // Ensure arrays are always present
      if (!data.recentCrops) data.recentCrops = [];
      if (!data.recentOrders) data.recentOrders = [];
      if (!data.cropStatusBreakdown) data.cropStatusBreakdown = {};
      if (!data.orderStatusBreakdown) data.orderStatusBreakdown = {};
      
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };
  
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-700 text-white rounded-lg p-6 shadow-md">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2">Manage the marketplace, review crops, and oversee operations.</p>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Error loading data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Error message if data failed to load */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error loading data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome section */}
      <div className="bg-blue-700 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-2">Manage the marketplace, review crops, and oversee operations.</p>
      </div>
      
      {/* Stats cards - using real API data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Users className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <ShoppingBag className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Crops</p>
                  <p className="text-2xl font-bold">{stats.totalCrops}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                  <Truck className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <AlertCircle className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Reviews</p>
                  <p className="text-2xl font-bold">{stats.pendingCrops}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 text-amber-600 mr-2" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentCrops && stats.recentCrops.filter(crop => crop.status === 'pending').slice(0, 3).map(crop => (
                <div key={crop.id} className="flex items-start p-3 bg-amber-50 rounded-md">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{crop.name}</h4>
                    <p className="text-sm text-gray-500">Submitted: {new Date(crop.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={crop.status} />
                </div>
              ))}
              
              {(!stats?.recentCrops || stats.recentCrops.filter(crop => crop.status === 'pending').length === 0) && (
                <div className="p-3 text-center text-gray-500">
                  No pending approvals
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/admin/crops" className="w-full">
              <Button variant="outline" fullWidth>
                View All Pending ({stats.pendingCrops})
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
              Recent Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentCrops && stats.recentCrops.filter(crop => ['approved', 'listed'].includes(crop.status)).slice(0, 3).map(crop => (
                <div key={crop.id} className="flex items-start p-3 bg-green-50 rounded-md">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{crop.name}</h4>
                    <p className="text-sm text-gray-500">Approved: {new Date(crop.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={crop.status} />
                </div>
              ))}
              
              {(!stats?.recentCrops || stats.recentCrops.filter(crop => ['approved', 'listed'].includes(crop.status)).length === 0) && (
                <div className="p-3 text-center text-gray-500">
                  No recent approvals
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/admin/crops?status=approved" className="w-full">
              <Button variant="outline" fullWidth>
                View All Approved ({stats.approvedCrops})
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <BarChart2 className="h-5 w-5 text-blue-600 mr-2" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-gray-700">Pending</span>
                <Badge variant="warning">{stats?.orderStatusBreakdown?.['pending'] || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-gray-700">Confirmed</span>
                <Badge variant="info">{stats?.orderStatusBreakdown?.['confirmed'] || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-gray-700">In Transit</span>
                <Badge variant="info">{stats?.orderStatusBreakdown?.['in-transit'] || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-gray-700">Delivered</span>
                <Badge variant="success">{stats?.orderStatusBreakdown?.['delivered'] || 0}</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/admin/orders" className="w-full">
              <Button variant="outline" fullWidth>
                Manage Orders
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      {/* User activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={`flex items-start space-x-3 p-3 rounded-md ${
                    order.status === 'pending' ? 'bg-amber-50' :
                    order.status === 'confirmed' ? 'bg-blue-50' :
                    order.status === 'in-transit' ? 'bg-orange-50' :
                    'bg-green-50'
                  }`}
                >
                  <div className="flex-shrink-0 pt-1">
                    <div className={`h-2 w-2 rounded-full ${
                      order.status === 'pending' ? 'bg-amber-500' :
                      order.status === 'confirmed' ? 'bg-blue-500' :
                      order.status === 'in-transit' ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      Order <span className="font-medium">#{order.id}</span> for <span className="font-medium">{order.crop_name || 'Unknown'}</span> by {order.buyer_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};