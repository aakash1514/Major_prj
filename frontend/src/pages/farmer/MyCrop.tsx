import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Eye, Edit, Trash2,
  Package, DollarSign, AlertCircle, X, Upload
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { useCropsStore } from '../../store/cropsStore';
import { API_URL } from '../../config';
import { uploadImage, validateImageFile, MAX_CROP_IMAGES } from '../../utils/uploadImage';
import { Crop } from '../../types';

interface EditForm {
  name: string;
  quantity: string;
  unit: string;
  price: string;
  description: string;
  tac: string;
}

type EditErrors = Partial<Record<keyof EditForm, string>>;

interface NewImage {
  file: File;
  previewUrl: string;
}

// Approved/listed crops are locked after admin review
const isEditable = (status: Crop['status']) => status === 'pending' || status === 'rejected';

export const MyCrop: React.FC = () => {
  const { user } = useAuthStore();
  const { crops, setCrops, getCropsByFarmer, fetchCropsByFarmer } = useCropsStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', quantity: '', unit: '', price: '', description: '', tac: '',
  });
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const newImagesRef = useRef<NewImage[]>([]);
  newImagesRef.current = newImages;

  // Revoke any remaining preview URLs on unmount
  useEffect(() => () => {
    newImagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const clearNewImages = () => {
    newImages.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setNewImages([]);
  };

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

  const openEditModal = (crop: Crop) => {
    setEditingCrop(crop);
    setEditForm({
      name: crop.name,
      quantity: String(crop.quantity),
      unit: crop.unit,
      price: crop.price ? String(crop.price) : '',
      description: crop.description || '',
      tac: crop.tac || '',
    });
    setKeptImages(crop.images || []);
    clearNewImages();
    setEditErrors({});
    setEditError('');
  };

  const closeEditModal = () => {
    if (isSaving) return;
    clearNewImages();
    setEditingCrop(null);
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
    if (files.length === 0) return;

    if (keptImages.length + newImages.length + files.length > MAX_CROP_IMAGES) {
      setEditError(`A crop can have at most ${MAX_CROP_IMAGES} images`);
      return;
    }
    for (const file of files) {
      const fileError = validateImageFile(file);
      if (fileError) {
        setEditError(fileError);
        return;
      }
    }

    setEditError('');
    setNewImages(prev => [
      ...prev,
      ...files.map(file => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const handleRemoveKeptImage = (url: string) => {
    setKeptImages(prev => prev.filter(image => image !== url));
  };

  const handleRemoveNewImage = (index: number) => {
    URL.revokeObjectURL(newImages[index].previewUrl);
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditChange = (field: keyof EditForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrop) return;

    const quantity = Number(editForm.quantity);
    const price = Number(editForm.price);
    const errors: EditErrors = {};
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (!editForm.unit) errors.unit = 'Unit is required';
    if (!(quantity > 0)) errors.quantity = 'Quantity must be greater than 0';
    if (!(price > 0)) errors.price = 'Price must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSaving(true);
    setEditError('');

    let uploadedUrls: string[];
    try {
      setIsUploading(true);
      uploadedUrls = await Promise.all(newImages.map(image => uploadImage(image.file, 'crop')));
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Image upload failed');
      setIsSaving(false);
      return;
    } finally {
      setIsUploading(false);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/crops/${editingCrop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          quantity,
          unit: editForm.unit,
          price,
          description: editForm.description,
          tac: editForm.tac,
          images: [...keptImages, ...uploadedUrls],
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEditError(data.error || 'Failed to update crop');
        return;
      }

      // Backend returns a snake_case row; map it onto the store's Crop shape
      const updated = data.crop;
      const updatedCrop: Crop = {
        ...editingCrop,
        name: updated.name,
        quantity: Number(updated.quantity),
        unit: updated.unit,
        description: updated.description,
        status: updated.status,
        price: updated.price ? Number(updated.price) : 0,
        tac: updated.tac,
        images: updated.images || [],
      };
      setCrops(crops.map(c => (c.id === updatedCrop.id ? updatedCrop : c)));
      clearNewImages();
      setEditingCrop(null);
    } catch (error) {
      console.error('Error updating crop:', error);
      setEditError('Failed to update crop. Please try again.');
    } finally {
      setIsSaving(false);
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
                  ₹{farmerCrops.reduce((sum, crop) => sum + ((crop.price || 0) * crop.quantity), 0).toLocaleString()}
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
                        <span className="font-semibold text-green-700">₹{crop.price} / {crop.unit}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => navigate(`/farmer/crops/${crop.id}`)}
                      >
                        View
                      </Button>
                      {isEditable(crop.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit size={14} />}
                          onClick={() => openEditModal(crop)}
                        >
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

      {/* Edit Crop Modal */}
      {editingCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Crop</h2>
                  {editingCrop.status === 'rejected' && (
                    <p className="text-sm text-gray-600">Saving will resubmit this crop for admin review.</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={closeEditModal}>
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <Input
                  id="edit-name"
                  label="Crop Name"
                  value={editForm.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  error={editErrors.name}
                  fullWidth
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="edit-quantity"
                    label="Quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.quantity}
                    onChange={(e) => handleEditChange('quantity', e.target.value)}
                    error={editErrors.quantity}
                    fullWidth
                  />
                  <Select
                    id="edit-unit"
                    label="Unit"
                    options={[
                      { value: 'kg', label: 'Kilograms (kg)' },
                      { value: 'tons', label: 'Tons' },
                      { value: 'lbs', label: 'Pounds (lbs)' },
                      { value: 'bushels', label: 'Bushels' },
                    ]}
                    value={editForm.unit}
                    onChange={(e) => handleEditChange('unit', e.target.value)}
                    error={editErrors.unit}
                    fullWidth
                  />
                </div>
                <Input
                  id="edit-price"
                  label="Price (per unit)"
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.price}
                  onChange={(e) => handleEditChange('price', e.target.value)}
                  error={editErrors.price}
                  fullWidth
                />
                <Textarea
                  id="edit-description"
                  label="Description"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  fullWidth
                />
                <Textarea
                  id="edit-tac"
                  label="Terms and Conditions"
                  rows={3}
                  value={editForm.tac}
                  onChange={(e) => handleEditChange('tac', e.target.value)}
                  fullWidth
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Crop Images</label>
                  {keptImages.length + newImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {keptImages.map((url, index) => (
                        <div key={url} className="relative h-20 w-20">
                          <img src={url} alt={`Crop image ${index + 1}`} className="h-20 w-20 object-cover rounded-md" />
                          <button
                            type="button"
                            onClick={() => handleRemoveKeptImage(url)}
                            disabled={isSaving}
                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {newImages.map((image, index) => (
                        <div key={image.previewUrl} className="relative h-20 w-20">
                          <img src={image.previewUrl} alt={`New image ${index + 1}`} className="h-20 w-20 object-cover rounded-md" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            disabled={isSaving}
                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                            aria-label={`Remove new image ${index + 1}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {keptImages.length + newImages.length < MAX_CROP_IMAGES && (
                    <label
                      htmlFor="edit-images"
                      className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-green-600 hover:text-green-500"
                    >
                      <Upload size={16} />
                      <span>Add images</span>
                      <input
                        id="edit-images"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAddImages}
                        disabled={isSaving}
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-500">JPG, PNG or WEBP, up to 5 MB each, max 5 images</p>
                </div>

                {editError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{editError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeEditModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isUploading ? 'Uploading images…' : isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};