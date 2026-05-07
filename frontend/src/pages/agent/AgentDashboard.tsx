import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TruckIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../store/authStore';

interface Delivery {
  id: string;
  order_id: string;
  crop_name: string;
  buyer_name: string;
  buyer_location?: string;
  status: 'assigned' | 'in-transit' | 'delivered';
  quantity: number;
  total_amount: number;
  delivery_date?: string;
  created_at?: string;
}

interface InspectionAssignment {
  id: string;
  name: string;
  quantity: number;
  harvest_date?: string;
  status: string;
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

const buildDemandInput = (crop: InspectionAssignment) => {
  const now = new Date();
  const harvestDate = crop.harvest_date ? new Date(crop.harvest_date) : now;
  const cropSeed = encodeStringToNumber(crop.name.toLowerCase());

  return {
    features: [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      getWeekday(now),
      cropSeed % 1000,
      crop.quantity,
      harvestDate.getMonth() + 1,
      harvestDate.getDate(),
      getWeekday(harvestDate),
      crop.status === 'pending' ? 1 : 0,
      cropSeed % 500,
      cropSeed % 250,
      Math.max(1, Math.round(crop.quantity / 5)),
      Math.max(1, Math.round(crop.quantity / 10)),
      Math.max(1, Math.round(crop.quantity / 20)),
      1,
    ],
  };
};

export const AgentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [inspectionAssignments, setInspectionAssignments] = useState<InspectionAssignment[]>([]);
  const [selectedInspectionCropId, setSelectedInspectionCropId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from deliveries
  const assignedDeliveries = deliveries.filter(d => d.status === 'assigned').length;
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
  const inTransitDeliveries = deliveries.filter(d => d.status === 'in-transit').length;
  const totalDeliveries = deliveries.length;

  // Get today's tasks (assigned and in-transit orders)
  const todayTasks = deliveries
    .filter(d => d.status === 'assigned' || d.status === 'in-transit')
    .slice(0, 3)
    .map(d => ({
      id: d.id,
      type: 'delivery',
      cropName: d.crop_name,
      buyerName: d.buyer_name,
      location: d.buyer_location || 'Location pending',
      status: d.status,
    }));

  // Get recent activity from all deliveries
  const recentActivity = deliveries.slice(0, 3).reverse();

  const selectedInspectionCrop = useMemo(
    () => inspectionAssignments.find((crop) => crop.id === selectedInspectionCropId) || inspectionAssignments[0],
    [inspectionAssignments, selectedInspectionCropId]
  );

  const demandContextInput = useMemo(
    () => (selectedInspectionCrop ? buildDemandInput(selectedInspectionCrop) : null),
    [selectedInspectionCrop]
  );

  useEffect(() => {
    void fetchDeliveries();
    void fetchInspectionAssignments();
  }, []);

  useEffect(() => {
    if (!inspectionAssignments.length) {
      setSelectedInspectionCropId(null);
      return;
    }

    if (!selectedInspectionCropId) {
      setSelectedInspectionCropId(inspectionAssignments[0].id);
    }
  }, [inspectionAssignments, selectedInspectionCropId]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agent/my-deliveries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deliveries: ${response.statusText}`);
      }

      const data = await response.json();
      setDeliveries(data || []);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectionAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agent/inspections/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inspection assignments: ${response.statusText}`);
      }

      const data = await response.json();
      const assignments = (Array.isArray(data) ? data : []).map((crop: any) => ({
        id: String(crop.id),
        name: String(crop.name || 'Unknown Crop'),
        quantity: Number(crop.quantity) || 0,
        harvest_date: crop.harvest_date,
        status: String(crop.status || 'pending'),
      }));

      setInspectionAssignments(assignments);
    } catch (err) {
      console.error('Error fetching inspection assignments:', err);
    }
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
      <div className="bg-purple-700 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Welcome, {user?.name || 'Agent'}</h1>
        <p className="mt-2">Manage crop deliveries efficiently and track all your assignments.</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <TruckIcon className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{totalDeliveries}</p>
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
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <TruckIcon className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned</p>
                  <p className="text-2xl font-bold">{assignedDeliveries}</p>
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
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <TruckIcon className="h-6 w-6 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">In Transit</p>
                  <p className="text-2xl font-bold">{inTransitDeliveries}</p>
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
                  <CheckCircle2 className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{completedDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demand context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inspectionAssignments.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {inspectionAssignments.slice(0, 5).map((crop) => (
                  <button
                    type="button"
                    key={crop.id}
                    onClick={() => setSelectedInspectionCropId(crop.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedInspectionCropId === crop.id
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {crop.name}
                  </button>
                ))}
              </div>

              {selectedInspectionCrop && demandContextInput && (
                <PredictionPanel
                  mode="demand"
                  inputData={demandContextInput}
                  cropName={selectedInspectionCrop.name}
                  className="shadow-none"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No inspection crops currently assigned.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Today's schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length > 0 ? (
            <div className="space-y-4">
              {todayTasks.map(task => (
                <div key={task.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50">
                  <div className="mr-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TruckIcon className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{task.cropName}</h3>
                        <p className="text-sm text-gray-500">{task.buyerName} • {task.location}</p>
                      </div>
                      <Badge variant={task.status === 'assigned' ? 'info' : 'warning'}>
                        {task.status === 'assigned' ? 'Assigned' : 'In Transit'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No active deliveries right now.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Deliveries info */}
      <Card>
        <CardHeader>
          <CardTitle>My Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            View and manage all your assigned delivery orders. Track their status from pickup to final delivery.
          </p>
        </CardContent>
        <CardFooter>
          <Link to="/agent/deliveries" className="w-full">
            <Button variant="primary" fullWidth>
              Go to My Deliveries
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Orders history
      <Card>
        <CardHeader>
          <CardTitle>Orders Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            View complete order history including delivered, in-transit, and assigned orders.
          </p>
        </CardContent>
        <CardFooter>
          <Link to="/agent/orders" className="w-full">
            <Button variant="outline" fullWidth>
              View Orders Log
            </Button>
          </Link>
        </CardFooter>
      </Card> */}
      
      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-md ${
                  activity.status === 'delivered' ? 'bg-green-50' : 
                  activity.status === 'in-transit' ? 'bg-blue-50' : 
                  'bg-amber-50'
                }`}>
                  <div className="flex-shrink-0 pt-1">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'delivered' ? 'bg-green-500' :
                      activity.status === 'in-transit' ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      {activity.status === 'delivered' ? 'Delivered' :
                       activity.status === 'in-transit' ? 'In Transit' :
                       'Assigned'} <span className="font-medium">{activity.crop_name}</span> to {activity.buyer_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Order ID: {activity.order_id}</p>
                  </div>
                  <StatusBadge status={
                    activity.status === 'delivered' ? 'approved' :
                    activity.status === 'in-transit' ? 'pending' :
                    'pending'
                  } />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No activity yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};