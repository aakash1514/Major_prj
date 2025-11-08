import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as ChartComponents from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { PlusCircle, Leaf, Package, Truck, Clipboard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CropCard } from '../../components/common/CropCard';
import { useAuthStore } from '../../store/authStore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalCrops: number;
  pendingCrops: number;
  approvedCrops: number;
  rejectedCrops: number;
  totalOrders: number;
  totalRevenue: number;
  cropStatusBreakdown: Record<string, number>;
  orderStatusBreakdown: Record<string, number>;
  recentCrops: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    price: number;
    quantity: number;
    unit: string;
    description: string;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    total_amount: number;
    quantity: number;
    crop_name: string;
    buyer_name: string;
  }>;
}

export const FarmerDashboard: React.FC = () => {
  const { user } = useAuthStore();
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
      const response = await fetch('http://localhost:5000/api/farmer/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[FarmerDashboard] API Response:', data);

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
        <div className="bg-green-700 text-white rounded-lg p-6 shadow-md">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
          <p className="mt-2">Manage your crops and track your farming business.</p>
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
  
  // Chart data
  const barChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Crops Sold',
        data: [12, 19, 10, 15, 22, 30],
        backgroundColor: 'rgba(46, 125, 50, 0.7)',
      },
    ],
  };
  
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue ($)',
        data: [1200, 1900, 1000, 1500, 2200, 3000],
        borderColor: 'rgb(255, 143, 0)',
        backgroundColor: 'rgba(255, 143, 0, 0.1)',
        tension: 0.3,
      },
    ],
  };
  
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
      <div className="bg-green-700 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="mt-2">Manage your crops and track your farming business.</p>
        <div className="mt-4">
          <Link to="/farmer/add-crop">
            <Button variant="secondary" icon={<PlusCircle size={16} />}>
              Add New Crop
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Leaf className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Crops</p>
                  <p className="text-2xl font-bold">{stats?.totalCrops || 0}</p>
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
                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                  <Clipboard className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold">{stats?.pendingCrops || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Package className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Approved Crops</p>
                  <p className="text-2xl font-bold">{stats?.approvedCrops || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <Truck className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold">{stats?.rejectedCrops || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{stats?.totalCrops || 0}</div>
              <div className="text-sm text-blue-600">Total Crops</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats?.approvedCrops || 0}</div>
              <div className="text-sm text-green-600">Listed for Sale</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{stats?.totalOrders || 0}</div>
              <div className="text-sm text-purple-600">Total Orders</div>
            </div>

            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">${(stats?.totalRevenue || 0).toFixed(0)}</div>
              <div className="text-sm text-amber-600">Total Revenue</div>
            </div>

            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-700">{stats?.pendingCrops || 0}</div>
              <div className="text-sm text-emerald-600">Pending Review</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartComponents.Bar data={barChartData} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartComponents.Line data={lineChartData} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent crops */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Crops</h2>
          <Link to="/farmer/crops">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats?.recentCrops && stats.recentCrops.length > 0 ? (
            stats.recentCrops.slice(0, 3).map((crop: any) => (
              <motion.div
                key={crop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CropCard crop={crop} linkTo={`/farmer/crops/${crop.id}`} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4">You haven't added any crops yet.</p>
              <Link to="/farmer/add-crop">
                <Button variant="primary">Add Your First Crop</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.slice(0, 3).map((order: any, index: number) => (
                <li key={order.id} className={`flex items-start space-x-3 p-3 rounded-md ${index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex-shrink-0 pt-1">
                    <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">
                      New order received for <span className="font-medium">{order.crop_name}</span> from <span className="font-medium">{order.buyer_name || 'Unknown'}</span>.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge status={order.status} />
                  </div>
                </li>
              ))
            ) : (
              <li className="text-center py-8 text-gray-500">
                No recent orders yet. Start listing crops to receive orders!
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};