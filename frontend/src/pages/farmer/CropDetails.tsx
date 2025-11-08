import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Package, DollarSign, MapPin, 
  User, Edit, Trash2, Eye, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { useCropsStore } from '../../store/cropsStore';
import { useOrdersStore } from '../../store/ordersStore';

export const CropDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { crops, getCropById, updateCropStatus } = useCropsStore();
  const { orders } = useOrdersStore();

  const crop = id ? getCropById(id) : null;
  const cropOrders = crop ? orders.filter(order => order.cropId === crop.id) : [];

  if (!crop) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Crop not found</h2>
          <p className="text-gray-600 mb-4">The crop you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    // In a real app, this would navigate to edit page
    console.log('Edit crop:', crop.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this crop?')) {
      // In a real app, this would call an API
      console.log('Delete crop:', crop.id);
      navigate('/farmer/crops');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-amber-200 bg-amber-50';
      case 'approved': return 'border-green-200 bg-green-50';
      case 'listed': return 'border-blue-200 bg-blue-50';
      case 'rejected': return 'border-red-200 bg-red-50';
      case 'sold': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-amber-600" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'listed': return <Eye className="h-5 w-5 text-blue-600" />;
      case 'rejected': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'sold': return <Package className="h-5 w-5 text-purple-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{crop.name}</h1>
            <p className="text-gray-600">Crop Details & Management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {crop.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Edit size={16} />}
                onClick={handleEdit}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={16} />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Crop Overview */}
          <Card className={`border-2 ${getStatusColor(crop.status)}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(crop.status)}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{crop.name}</h2>
                    <StatusBadge status={crop.status} />
                  </div>
                </div>
                {crop.price && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700">${crop.price}</p>
                    <p className="text-sm text-gray-500">per {crop.unit}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-semibold">{crop.quantity} {crop.unit}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Harvest Date</p>
                    <p className="font-semibold">{new Date(crop.harvestDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {crop.price && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="font-semibold">${(crop.price * crop.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {crop.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{crop.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Crop Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crop.images.map((image, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg">
                    <img
                      src={image}
                      alt={`${crop.name} ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          {crop.tac && (
            <Card>
              <CardHeader>
                <CardTitle>Terms and Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{crop.tac}</p>
              </CardContent>
            </Card>
          )}

          {/* Orders for this crop */}
          {cropOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Orders for this Crop</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cropOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.id.substring(0, 8)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()} • ${order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Crop Submitted</p>
                    <p className="text-sm text-gray-500">Submitted for review</p>
                  </div>
                </div>

                {crop.status !== 'pending' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Quality Inspection</p>
                      <p className="text-sm text-gray-500">Passed quality check</p>
                    </div>
                  </div>
                )}

                {['approved', 'listed', 'sold'].includes(crop.status) && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Listed on Marketplace</p>
                      <p className="text-sm text-gray-500">Available for purchase</p>
                    </div>
                  </div>
                )}

                {crop.status === 'sold' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Sold</p>
                      <p className="text-sm text-gray-500">Transaction completed</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{cropOrders.length}</div>
                <div className="text-sm text-blue-600">Total Orders</div>
              </div>

              {crop.price && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    ${(crop.price * crop.quantity).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Potential Revenue</div>
                </div>
              )}

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {Math.ceil((new Date(crop.harvestDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-purple-600">Days Since Harvest</div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {crop.status === 'pending' && (
                <>
                  <Button variant="outline" fullWidth icon={<Edit size={16} />}>
                    Edit Details
                  </Button>
                  <Button variant="danger" fullWidth icon={<Trash2 size={16} />}>
                    Delete Crop
                  </Button>
                </>
              )}
              
              {crop.status === 'listed' && (
                <Button variant="outline" fullWidth icon={<Eye size={16} />}>
                  View on Marketplace
                </Button>
              )}
              
              <Button variant="outline" fullWidth icon={<Package size={16} />}>
                Download Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};