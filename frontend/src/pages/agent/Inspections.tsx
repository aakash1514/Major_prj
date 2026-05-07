import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Eye, CheckCircle, X, Clock, 
  Calendar, Package, User, MapPin, Camera, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { useCropsStore } from '../../store/cropsStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';

interface DemandPredictionEntry {
  value: number | null;
  loading: boolean;
  error?: string;
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

const buildDemandInput = (crop: {
  name: string;
  quantity: number;
  harvestDate: Date;
  status: string;
}) => {
  const now = new Date();
  const harvestDate = new Date(crop.harvestDate);
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
      crop.status === 'inspected' ? 1 : 0,
      crop.status === 'approved' ? 1 : 0,
      Math.max(1, Math.round(crop.quantity / 5)),
      Math.max(1, Math.round(crop.quantity / 10)),
      Math.max(1, Math.round(crop.quantity / 20)),
      1,
    ],
  };
};

const getDemandLevel = (value: number) => {
  if (value >= 10000000) {
    return { label: 'High', variant: 'success' as const };
  }

  if (value >= 2000000) {
    return { label: 'Medium', variant: 'warning' as const };
  }

  return { label: 'Low', variant: 'info' as const };
};

export const Inspections: React.FC = () => {
  const { user } = useAuthStore();
  const { crops, updateCropStatus, addQualityReport } = useCropsStore();
  const [demandPredictions, setDemandPredictions] = useState<Record<string, DemandPredictionEntry>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState({
    weight: '',
    size: '',
    condition: '',
    notes: '',
    recommendation: 'approve' as 'approve' | 'reject',
  });

  // Filter crops that need inspection or have been inspected
  const inspectionCrops = useMemo(
    () => crops.filter((crop) =>
      crop.status === 'pending' || crop.status === 'inspected' || crop.status === 'approved' || crop.status === 'rejected'
    ),
    [crops]
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchDemandPredictions = async () => {
      if (!inspectionCrops.length) {
        setDemandPredictions({});
        return;
      }

      setDemandPredictions(
        Object.fromEntries(
          inspectionCrops.map((crop) => [
            crop.id,
            { value: null, loading: true } as DemandPredictionEntry,
          ])
        )
      );

      const results = await Promise.all(
        inspectionCrops.map(async (crop) => {
          try {
            const response = await api.post('/predictions/demand', buildDemandInput(crop)) as {
              prediction: number;
            };

            return [crop.id, { value: response.prediction, loading: false } as DemandPredictionEntry] as const;
          } catch (error) {
            return [
              crop.id,
              {
                value: null,
                loading: false,
                error: error instanceof Error ? error.message : 'Demand unavailable',
              } as DemandPredictionEntry,
            ] as const;
          }
        })
      );

      if (!isCancelled) {
        setDemandPredictions(Object.fromEntries(results));
      }
    };

    void fetchDemandPredictions();

    return () => {
      isCancelled = true;
    };
  }, [inspectionCrops]);

  // Apply filters
  const filteredCrops = inspectionCrops.filter(crop => {
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
      case 'status':
        return a.status.localeCompare(b.status);
      case 'harvest':
        return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime();
      case 'newest':
      default:
        return 0; // In real app, would sort by submission date
    }
  });

  const getInspectionStats = () => {
    return {
      total: inspectionCrops.length,
      pending: inspectionCrops.filter(c => c.status === 'pending').length,
      inspected: inspectionCrops.filter(c => c.status === 'inspected').length,
      approved: inspectionCrops.filter(c => c.status === 'approved').length,
      rejected: inspectionCrops.filter(c => c.status === 'rejected').length,
    };
  };

  const stats = getInspectionStats();

  const handleStartInspection = (cropId: string) => {
    setSelectedCrop(cropId);
    setInspectionData({
      weight: '',
      size: '',
      condition: '',
      notes: '',
      recommendation: 'approve',
    });
  };

  const handleSubmitInspection = () => {
    if (!selectedCrop || !user) return;

    const crop = crops.find(c => c.id === selectedCrop);
    if (!crop) return;

    // Create quality report
    const qualityReport = {
      id: `qr${Date.now()}`,
      cropId: selectedCrop,
      agentId: user.id,
      date: new Date(),
      weight: parseFloat(inspectionData.weight) || crop.quantity,
      size: inspectionData.size,
      condition: inspectionData.condition,
      images: crop.images, // In real app, would upload new inspection images
      notes: inspectionData.notes,
      recommendation: inspectionData.recommendation,
    };

    addQualityReport(qualityReport);
    
    // Update crop status based on recommendation
    const newStatus = inspectionData.recommendation === 'approve' ? 'approved' : 'rejected';
    updateCropStatus(selectedCrop, newStatus);

    setSelectedCrop(null);
  };

  const selectedCropData = selectedCrop ? crops.find(c => c.id === selectedCrop) : null;

  const renderDemandPriorityBadge = (cropId: string) => {
    const prediction = demandPredictions[cropId];

    if (!prediction || prediction.loading) {
      return <Badge variant="outline" size="sm">Demand: Checking...</Badge>;
    }

    if (prediction.value === null || prediction.error) {
      return <Badge variant="outline" size="sm">Demand: Unavailable</Badge>;
    }

    const level = getDemandLevel(prediction.value);
    return <Badge variant={level.variant} size="sm">Demand: {level.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quality Inspections</h1>
        <p className="text-gray-600 mt-1">Inspect and verify crop quality for marketplace listing</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Inspections</div>
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
              <div className="text-2xl font-bold text-purple-700">{stats.inspected}</div>
              <div className="text-sm text-gray-500">Inspected</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
                { value: 'pending', label: 'Pending Inspection' },
                { value: 'inspected', label: 'Inspected' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48"
            />

            <Select
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'name', label: 'Name A-Z' },
                { value: 'status', label: 'Status' },
                { value: 'harvest', label: 'Harvest Date' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      {sortedCrops.length > 0 ? (
        <div className="space-y-4">
          {sortedCrops.map((crop, index) => (
            <motion.div
              key={crop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Crop Image */}
                    <div className="w-full lg:w-24 h-48 lg:h-24 overflow-hidden rounded-lg flex-shrink-0">
                      <img
                        src={crop.images[0] || 'https://images.pexels.com/photos/601798/pexels-photo-601798.jpeg'}
                        alt={crop.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Crop Info */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
                          <p className="text-gray-600 text-sm line-clamp-2">{crop.description}</p>
                        </div>
                        <StatusBadge status={crop.status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Quantity</p>
                            <p className="font-medium">{crop.quantity} {crop.unit}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Harvest Date</p>
                            <p className="font-medium">{new Date(crop.harvestDate).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {crop.price && (
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-2">$</span>
                            <div>
                              <p className="text-gray-500">Price</p>
                              <p className="font-medium">${crop.price} / {crop.unit}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Farmer ID</p>
                            <p className="font-medium">{crop.farmerId.substring(0, 8)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Predicted demand level:</span>
                        {renderDemandPriorityBadge(crop.id)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:w-32">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye size={14} />}
                        fullWidth
                      >
                        View Details
                      </Button>
                      
                      {crop.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle size={14} />}
                          onClick={() => handleStartInspection(crop.id)}
                          fullWidth
                        >
                          Start Inspection
                        </Button>
                      )}

                      {crop.status === 'inspected' && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={<FileText size={14} />}
                          fullWidth
                        >
                          View Report
                        </Button>
                      )}
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
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inspections found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : "No crops available for inspection at the moment."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inspection Modal */}
      {selectedCrop && selectedCropData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Quality Inspection</h2>
                  <p className="text-gray-600">{selectedCropData.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X size={16} />}
                  onClick={() => setSelectedCrop(null)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Crop Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Crop Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCropData.images.map((image, index) => (
                        <div key={index} className="aspect-square overflow-hidden rounded-lg">
                          <img
                            src={image}
                            alt={`${selectedCropData.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{selectedCropData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span className="font-medium">{selectedCropData.quantity} {selectedCropData.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Harvest Date:</span>
                        <span className="font-medium">{new Date(selectedCropData.harvestDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Farmer ID:</span>
                        <span className="font-medium">{selectedCropData.farmerId.substring(0, 8)}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600 text-sm">{selectedCropData.description}</p>
                    </div>
                  </div>
                </div>

                {/* Inspection Form */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Inspection Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Actual Weight"
                        type="number"
                        placeholder={selectedCropData.quantity.toString()}
                        value={inspectionData.weight}
                        onChange={(e) => setInspectionData(prev => ({ ...prev, weight: e.target.value }))}
                        fullWidth
                      />
                      
                      <Select
                        label="Size Grade"
                        options={[
                          { value: 'Small', label: 'Small' },
                          { value: 'Medium', label: 'Medium' },
                          { value: 'Large', label: 'Large' },
                          { value: 'Extra Large', label: 'Extra Large' },
                        ]}
                        value={inspectionData.size}
                        onChange={(e) => setInspectionData(prev => ({ ...prev, size: e.target.value }))}
                        fullWidth
                      />
                    </div>

                    <Select
                      label="Overall Condition"
                      options={[
                        { value: 'Excellent', label: 'Excellent' },
                        { value: 'Good', label: 'Good' },
                        { value: 'Fair', label: 'Fair' },
                        { value: 'Poor', label: 'Poor' },
                      ]}
                      value={inspectionData.condition}
                      onChange={(e) => setInspectionData(prev => ({ ...prev, condition: e.target.value }))}
                      fullWidth
                    />

                    <Textarea
                      label="Inspection Notes"
                      placeholder="Detailed observations about the crop quality, appearance, freshness, etc."
                      rows={4}
                      value={inspectionData.notes}
                      onChange={(e) => setInspectionData(prev => ({ ...prev, notes: e.target.value }))}
                      fullWidth
                    />

                    <Select
                      label="Recommendation"
                      options={[
                        { value: 'approve', label: 'Approve for Marketplace' },
                        { value: 'reject', label: 'Reject - Does not meet standards' },
                      ]}
                      value={inspectionData.recommendation}
                      onChange={(e) => setInspectionData(prev => ({ ...prev, recommendation: e.target.value as 'approve' | 'reject' }))}
                      fullWidth
                    />

                    <div className="flex space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCrop(null)}
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        variant={inspectionData.recommendation === 'approve' ? 'success' : 'danger'}
                        onClick={handleSubmitInspection}
                        fullWidth
                        disabled={!inspectionData.condition || !inspectionData.size}
                      >
                        Submit Inspection
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};