import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Box, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CropCard } from '../../components/common/CropCard';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import { useAuthStore } from '../../store/authStore';

interface DashboardStats {
  totalOrders: number;
  availableCrops: number;
  pendingDelivery: number;
  totalSpent: number;
  orderStatusBreakdown: Record<string, number>;
  recentOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    total_amount: number;
    crop_name: string;
    farmer_name: string;
  }>;
  featuredCrops: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    farmer_id: string;
    price: number;
  }>;
}

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

export const BuyerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const priceTrendCropTypes = useMemo(() => {
    if (!stats) return [] as string[];

    const orderedTypes = stats.recentOrders
      .map((order) => (order.crop_name || '').trim())
      .filter(Boolean);
    const featuredTypes = stats.featuredCrops
      .map((crop) => (crop.name || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...orderedTypes, ...featuredTypes]));
  }, [stats]);

  const primaryPriceTrendCrop = priceTrendCropTypes[0] || 'Mixed Crops';

  const priceTrendInputData = useMemo(() => {
    const now = new Date();
    const cropSeed = encodeStringToNumber(primaryPriceTrendCrop.toLowerCase());
    const buyerSeed = encodeStringToNumber((user?.name || 'buyer').toLowerCase());
    const marketSeed = encodeStringToNumber('marketplace');
    const arrivals = stats ? Math.max(0.1, Number((stats.availableCrops / 10).toFixed(2))) : 0.1;

    return {
      features: {
        'State Name': buyerSeed % 36,
        'District Name': buyerSeed % 64,
        'Market Name': marketSeed % 128,
        Variety: cropSeed % 200,
        Group: (cropSeed + marketSeed) % 40,
        Grade: ((stats?.pendingDelivery || 0) % 3) + 1,
        'Arrivals (Tonnes)': arrivals,
        Month: now.getMonth() + 1,
        Day: now.getDate(),
        Weekday: getWeekday(now),
      },
    };
  }, [primaryPriceTrendCrop, stats, user?.name]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/buyers/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[BuyerDashboard] API Response:', data);

      // Ensure arrays are always present
      if (!data.recentOrders) data.recentOrders = [];
      if (!data.featuredCrops) data.featuredCrops = [];
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
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg p-6 shadow-md">
          <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
          <p className="mt-2">Browse the freshest crops directly from farmers.</p>
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
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="mt-2">Browse the freshest crops directly from farmers.</p>
        <div className="mt-4">
          <Link to="/buyer/marketplace">
            <Button variant="primary" icon={<ShoppingCart size={16} />}>
              Browse Marketplace
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
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <ShoppingCart className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Orders Placed</p>
                  <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
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
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Box className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Crops</p>
                  <p className="text-2xl font-bold">{stats?.availableCrops || 0}</p>
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
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <TrendingUp className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold">${(stats?.totalSpent || 0).toFixed(2)}</p>
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
                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Delivery</p>
                  <p className="text-2xl font-bold">{stats?.pendingDelivery || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="border border-purple-100">
        <CardHeader>
          <CardTitle>Price trends</CardTitle>
          <p className="text-sm text-gray-600">
            Based on your recent ordered and viewed crop types: {priceTrendCropTypes.slice(0, 3).join(', ') || 'No recent crop activity'}
          </p>
        </CardHeader>
        <CardContent>
          <PredictionPanel
            mode="price"
            inputData={priceTrendInputData}
            cropName={primaryPriceTrendCrop}
          />
        </CardContent>
      </Card>
      
      {/* Featured crops */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Featured Crops</h2>
          <Link to="/buyer/marketplace">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats?.featuredCrops && stats.featuredCrops.length > 0 ? (
            stats.featuredCrops.map((crop: any) => (
              <motion.div
                key={crop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CropCard crop={crop} linkTo={`/buyer/marketplace/${crop.id}`} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No crops available in the marketplace yet.</p>
              <p className="text-gray-500 text-sm mt-2">Check back later for new listings.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Order ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Crop</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">#{order.id.substring(0, 6)}</td>
                      <td className="px-4 py-3">{order.crop_name || 'Unknown Crop'}</td>
                      <td className="px-4 py-3">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/buyer/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">Details</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
              <Link to="/buyer/marketplace">
                <Button variant="primary">Browse Marketplace</Button>
              </Link>
            </div>
          )}
        </CardContent>
        {stats?.recentOrders && stats.recentOrders.length > 0 && (
          <CardFooter className="flex justify-center">
            <Link to="/buyer/orders">
              <Button variant="outline">View All Orders</Button>
            </Link>
          </CardFooter>
        )}
      </Card>
      
      {/* Seasonal recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center text-center">
              <img 
                src="https://images.pexels.com/photos/2286776/pexels-photo-2286776.jpeg" 
                alt="Seasonal Crop" 
                className="w-16 h-16 object-cover rounded-full mb-3"
              />
              <h3 className="font-medium text-green-800">Spring Harvest</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fresh greens and early vegetables are in season now!
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg flex flex-col items-center text-center">
              <img 
                src="https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg" 
                alt="Seasonal Crop" 
                className="w-16 h-16 object-cover rounded-full mb-3"
              />
              <h3 className="font-medium text-amber-800">Best Deals</h3>
              <p className="text-sm text-gray-600 mt-1">
                Check out our featured crops at special prices
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center text-center">
              <img 
                src="https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg" 
                alt="Seasonal Crop" 
                className="w-16 h-16 object-cover rounded-full mb-3"
              />
              <h3 className="font-medium text-blue-800">Coming Soon</h3>
              <p className="text-sm text-gray-600 mt-1">
                Summer fruits will be available next month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};