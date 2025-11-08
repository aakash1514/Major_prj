import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Eye, Edit, Trash2, 
  Calendar, Package, DollarSign, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { useCropsStore } from '../../store/cropsStore';

export const MyCrop: React.FC = () => {
  const { user } = useAuthStore();
  const { getCropsByFarmer, fetchCropsByFarmer } = useCropsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch crops on mount
  useEffect(() => {
    const loadCrops = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await fetchCropsByFarmer(token);
      }
    };
    loadCrops();
  }, [fetchCropsByFarmer]);

  // Get farmer's crops
  const farmerCrops = user ? getCropsByFarmer(user.id) : [];

  // Apply filters
  const filteredCrops = farmerCrops.filter(crop => {
    const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crop.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || crop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort crops
  const sortedCrops = [...filteredCrops].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price':
        return (b.price || 0) - (a.price || 0);
      case 'quantity':
        return b.quantity - a.quantity;
      case 'harvest':
        return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime();
      case 'newest':
      default:
        return 0; // In real app, would sort by creation date
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 border-amber-200';
      case 'approved': return 'bg-green-50 border-green-200';
      case 'listed': return 'bg-blue-50 border-blue-200';
      case 'rejected': return 'bg-red-50 border-red-200';
      case 'sold': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const handleDeleteCrop = (cropId: string) => {
    if (window.confirm('Are you sure you want to delete this crop?')) {
      // In a real app, this would call an API to delete the crop
      console.log('Deleting crop:', cropId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Crops</h1>
          <p className="text-gray-600 mt-1">Manage your crop listings and track their status</p>
        </div>
        <Link to="/farmer/add-crop">
          <Button variant="primary" icon={<Plus size={16} />}>
            Add New Crop
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Package className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Crops</p>
                <p className="text-xl font-bold">{farmerCrops.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold">{farmerCrops.filter(c => c.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Package className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Listed</p>
                <p className="text-xl font-bold">{farmerCrops.filter(c => c.status === 'listed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <DollarSign className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-bold">
                  ${farmerCrops.reduce((sum, crop) => sum + ((crop.price || 0) * crop.quantity), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search crops..."
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
                { value: 'approved', label: 'Approved' },
                { value: 'listed', label: 'Listed' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'sold', label: 'Sold' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48"
            />

            <Select
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'name', label: 'Name A-Z' },
                { value: 'price', label: 'Price High-Low' },
                { value: 'quantity', label: 'Quantity High-Low' },
                { value: 'harvest', label: 'Harvest Date' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Crops Grid */}
      {sortedCrops.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCrops.map((crop, index) => (
            <motion.div
              key={crop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`h-full hover:shadow-lg transition-all duration-300 border-2 ${getStatusColor(crop.status)}`}>
                <div className="aspect-video overflow-hidden">
                  <img
                    src={crop.images[0] || 'https://images.pexels.com/photos/601798/pexels-photo-601798.jpeg'}
                    alt={crop.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
                    <StatusBadge status={crop.status} />
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{crop.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium">{crop.quantity} {crop.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Harvest Date:</span>
                      <span className="font-medium">{new Date(crop.harvestDate).toLocaleDateString()}</span>
                    </div>
                    {crop.price && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-semibold text-green-700">${crop.price} / {crop.unit}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />}>
                        View
                      </Button>
                      {crop.status === 'pending' && (
                        <Button variant="ghost" size="sm" icon={<Edit size={14} />}>
                          Edit
                        </Button>
                      )}
                    </div>
                    {crop.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDeleteCrop(crop.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No crops found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : "You haven't added any crops yet. Start by adding your first crop."
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/farmer/add-crop">
                <Button variant="primary" icon={<Plus size={16} />}>
                  Add Your First Crop
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/farmer/add-crop">
              <div className="p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <Plus className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Add New Crop</h4>
                    <p className="text-sm text-gray-500">Submit a new crop for approval</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Schedule Harvest</h4>
                  <p className="text-sm text-gray-500">Plan your upcoming harvests</p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Price Analytics</h4>
                  <p className="text-sm text-gray-500">View market price trends</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};