import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Package, DollarSign,
  Trash2, Eye, CheckCircle, Clock, AlertCircle, ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../config';

interface CropDetail {
  id: string;
  farmer_id: string;
  name: string;
  quantity: number;
  unit: string;
  harvest_date?: string | null;
  description?: string | null;
  images?: string[] | null;
  status: 'pending' | 'inspected' | 'approved' | 'rejected' | 'listed' | 'sold';
  price?: number | null;
  tac?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
}

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/601798/pexels-photo-601798.jpeg';

// Same resolution rules as CropCard: skip stale blob: URLs, prefix /uploads with the API host
const resolveImageUrl = (value?: string) => {
  if (!value) return null;
  if (value.startsWith('blob:')) {
    return null;
  }
  if (value.startsWith('http') || value.startsWith('data:')) {
    return value;
  }

  const apiBase = API_URL.replace(/\/api\/?$/, '');
  if (value.startsWith('/uploads')) {
    return `${apiBase}${value}`;
  }

  return value;
};

export const CropDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [crop, setCrop] = useState<CropDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const backPath = isFarmer ? '/farmer/crops' : '/buyer/marketplace';

  const fetchCrop = async () => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/crops/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.status === 404) {
        setCrop(null);
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load crop (${response.status})`);
      }

      const data = await response.json();
      setCrop(data);
    } catch (err) {
      console.error('Error fetching crop:', err);
      setError(err instanceof Error ? err.message : 'Failed to load crop');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrop();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading crop details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-2">
            <Button variant="outline" onClick={() => navigate(backPath)} icon={<ArrowLeft size={16} />}>
              Go Back
            </Button>
            <Button onClick={fetchCrop}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !crop) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Crop not found</h2>
          <p className="text-gray-600 mb-4">The crop you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(backPath)} icon={<ArrowLeft size={16} />}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = isFarmer && crop.farmer_id === user?.id;
  const price = crop.price !== undefined && crop.price !== null ? Number(crop.price) : null;
  const quantity = Number(crop.quantity) || 0;
  const images = (crop.images || [])
    .map(img => resolveImageUrl(img))
    .filter((img): img is string => Boolean(img));
  const displayImages = images.length > 0 ? images : [FALLBACK_IMAGE];

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this crop?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/crops/${crop.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to delete crop');
        return;
      }

      navigate('/farmer/crops');
    } catch (err) {
      console.error('Error deleting crop:', err);
      alert('Failed to delete crop');
    } finally {
      setIsDeleting(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(backPath)}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{crop.name}</h1>
            <p className="text-gray-600">{isOwner ? 'Crop Details & Management' : 'Crop Details'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isOwner && crop.status === 'pending' && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          {isBuyer && crop.status === 'listed' && (
            <Link to="/buyer/marketplace">
              <Button variant="primary" size="sm" icon={<ShoppingCart size={16} />}>
                Go to marketplace to order
              </Button>
            </Link>
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
                {price !== null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700">₹{price.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">per {crop.unit}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-semibold">{quantity} {crop.unit}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Harvest Date</p>
                    <p className="font-semibold">
                      {crop.harvest_date ? new Date(crop.harvest_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {price !== null && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="font-semibold">₹{(price * quantity).toLocaleString()}</p>
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

              {isOwner && crop.status === 'rejected' && crop.rejection_reason && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Rejection reason:</strong> {crop.rejection_reason}
                  </p>
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
                {displayImages.map((image, index) => (
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
                    <p className="text-sm text-gray-500">
                      {crop.created_at ? new Date(crop.created_at).toLocaleDateString() : 'Submitted for review'}
                    </p>
                  </div>
                </div>

                {['inspected', 'approved', 'listed', 'sold'].includes(crop.status) && (
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

                {crop.status === 'rejected' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Rejected</p>
                      <p className="text-sm text-gray-500">Did not pass review</p>
                    </div>
                  </div>
                )}

                {['listed', 'sold'].includes(crop.status) && (
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

          {/* Actions */}
          {(isOwner || (isBuyer && crop.status === 'listed')) && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isOwner && crop.status === 'pending' && (
                  <Button
                    variant="danger"
                    fullWidth
                    icon={<Trash2 size={16} />}
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Crop'}
                  </Button>
                )}

                {isOwner && crop.status !== 'pending' && (
                  <p className="text-sm text-gray-500">
                    No actions available once a crop has been reviewed.
                  </p>
                )}

                {isBuyer && crop.status === 'listed' && (
                  <Link to="/buyer/marketplace" className="block">
                    <Button variant="primary" fullWidth icon={<ShoppingCart size={16} />}>
                      Go to marketplace to order
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
