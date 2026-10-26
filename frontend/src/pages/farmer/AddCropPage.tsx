import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import { useAuthStore } from '../../store/authStore';
import { useCropsStore } from '../../store/cropsStore';
import { usePredictionsStore } from '../../store/predictionsStore';
import { Crop } from '../../types';
import { API_URL } from '../../config';
import { uploadImage, validateImageFile, MAX_CROP_IMAGES } from '../../utils/uploadImage';

interface AddCropFormData {
  name: string;
  quantity: number;
  unit: string;
  harvest_date: string;
  description: string;
  price: number;
  category: string;
}

const encodeTextToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

interface SelectedImage {
  file: File;
  previewUrl: string;
}

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

export const AddCropPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addCrop } = useCropsStore();
  const { fetchPricePrediction } = usePredictionsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const selectedImagesRef = useRef<SelectedImage[]>([]);
  selectedImagesRef.current = selectedImages;

  // Revoke any remaining preview URLs on unmount
  useEffect(() => () => {
    selectedImagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
  }, []);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AddCropFormData>();

  const watchedCropName = watch('name');
  const watchedQuantity = watch('quantity');
  const watchedHarvestDate = watch('harvest_date');

  const pricePredictionInput = useMemo(() => {
    const cropName = (watchedCropName || '').trim();
    const quantity = Number(watchedQuantity);
    const harvestDate = watchedHarvestDate ? new Date(watchedHarvestDate) : null;

    if (!cropName || !harvestDate || Number.isNaN(harvestDate.getTime()) || quantity <= 0) {
      return null;
    }

    const locationSeed = (user?.location || user?.name || 'default').toLowerCase();
    const cropSeed = encodeTextToNumber(cropName.toLowerCase());
    const locationCode = encodeTextToNumber(locationSeed);
    const arrivalsTonnes = quantity / 1000;

    return {
      features: {
        'State Name': locationCode % 36,
        'District Name': locationCode % 64,
        'Market Name': (locationCode + cropSeed) % 128,
        'Variety': cropSeed % 200,
        'Group': cropSeed % 40,
        'Grade': (cropSeed % 3) + 1,
        'Arrivals (Tonnes)': Number(arrivalsTonnes.toFixed(3)),
        Month: harvestDate.getMonth() + 1,
        Day: harvestDate.getDate(),
        Weekday: getWeekday(harvestDate),
      },
    };
  }, [watchedCropName, watchedHarvestDate, watchedQuantity, user?.location, user?.name]);

  useEffect(() => {
    if (!pricePredictionInput) return;

    const timer = window.setTimeout(() => {
      void fetchPricePrediction(pricePredictionInput);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchPricePrediction, pricePredictionInput]);
  
  const addFiles = (files: File[]) => {
    if (files.length === 0) return;

    if (selectedImages.length + files.length > MAX_CROP_IMAGES) {
      setImageError(`You can add at most ${MAX_CROP_IMAGES} images`);
      return;
    }
    for (const file of files) {
      const fileError = validateImageFile(file);
      if (fileError) {
        setImageError(fileError);
        return;
      }
    }

    setImageError('');
    setSelectedImages(prev => [
      ...prev,
      ...files.map(file => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
    addFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(selectedImages[index].previewUrl);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageError('');
  };
  
  const onSubmit = async (data: AddCropFormData) => {
  if (!user) return;
  setIsSubmitting(true);
  setImageError('');

  let images: string[];
  try {
    setIsUploading(true);
    images = await Promise.all(selectedImages.map(image => uploadImage(image.file, 'crop')));
  } catch (error) {
    setImageError(error instanceof Error ? error.message : 'Image upload failed');
    setIsSubmitting(false);
    return;
  } finally {
    setIsUploading(false);
  }

  try {
    // Send as JSON (not FormData)
    const payload = {
      name: data.name,
      quantity: Number(data.quantity),
      unit: data.unit,
      harvest_date: data.harvest_date,
      price: Number(data.price),
      description: data.description,
      tac: data.category,
      images
    };

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit crop');
    }

    console.log('✅ Crop added:', result);

    // Add crop to local store for immediate UI update
    const newCrop: Crop = {
      id: result.crop.id,
      farmerId: result.crop.farmer_id,
      name: result.crop.name,
      quantity: Number(result.crop.quantity),
      unit: result.crop.unit,
      harvestDate: new Date(result.crop.harvest_date),
      images: result.crop.images || [],
      description: result.crop.description,
      status: result.crop.status,
      price: result.crop.price ? Number(result.crop.price) : 0,
      tac: result.crop.tac,
    };
    
    addCrop(newCrop);

    alert('✅ Crop submitted successfully and is pending approval!');
    
    navigate('/farmer/crops', {
      state: {
        notification: {
          type: 'success',
          message: 'Crop submitted successfully and is pending approval.'
        }
      }
    });
  } catch (error) {
    console.error('❌ Submission error:', error);
    alert('❌ Failed to submit crop: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setIsSubmitting(false);
  }
};

  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add New Crop</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Crop Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="add-crop-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Crop Name"
                placeholder="e.g., Organic Wheat"
                {...register('name', { required: 'Crop name is required' })}
                error={errors.name?.message}
                fullWidth
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity"
                  type="number"
                  min="0"
                  placeholder="e.g., 500"
                  {...register('quantity', { 
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be greater than 0' }
                  })}
                  error={errors.quantity?.message}
                  fullWidth
                />
                
                <Select
                  label="Unit"
                  options={[
                    { value: 'kg', label: 'Kilograms (kg)' },
                    { value: 'tons', label: 'Tons' },
                    { value: 'lbs', label: 'Pounds (lbs)' },
                    { value: 'bushels', label: 'Bushels' },
                  ]}
                  {...register('unit', { required: 'Unit is required' })}
                  error={errors.unit?.message}
                  fullWidth
                />
              </div>
              
              <Input
                label="Harvest Date"
                type="date"
                {...register('harvest_date', { required: 'Harvest date is required' })}
                error={errors.harvest_date?.message}
                fullWidth
              />
              
              <div className="space-y-3">
                <Input
                  label="Expected Price (per unit)"
                  type="number"
                  placeholder="e.g., 250"
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 1, message: 'Price must be greater than 0' }
                  })}
                  error={errors.price?.message}
                  fullWidth
                />

                {pricePredictionInput && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800">AI suggested price</p>
                    <PredictionPanel
                      mode="price"
                      inputData={pricePredictionInput}
                      cropName={watchedCropName || 'Crop'}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <Textarea
              label="Description"
              placeholder="Describe your crop, growing methods, and any special characteristics..."
              rows={4}
              {...register('description', { required: 'Description is required' })}
              error={errors.description?.message}
              fullWidth
            />
            
            <Textarea
              label="Terms and Conditions"
              placeholder="Any specific terms or conditions for the sale of this crop..."
              rows={3}
              {...register('category', { required: 'category is required' })}
              error={errors.category?.message}
              fullWidth
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Crop Images
              </label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              >
                <div className="space-y-2 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="images"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none"
                    >
                      <span>Upload images</span>
                      <input
                        id="images"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    JPG, PNG or WEBP, up to 5 MB each, max 5 images
                  </p>
                </div>
              </div>
              
              {imageError && (
                <p className="text-sm text-red-600">{imageError}</p>
              )}

              {selectedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {selectedImages.map((image, index) => (
                    <div key={image.previewUrl} className="relative h-24 w-24">
                      <img
                        src={image.previewUrl}
                        alt={`Selected image ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isSubmitting}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          {/* Lives outside the form, so it submits it by id */}
          <Button
            type="submit"
            form="add-crop-form"
            disabled={isSubmitting}
          >
            {isUploading ? 'Uploading images…' : 'Submit'}
          </Button>

        </CardFooter>
      </Card>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-50 p-4 rounded-lg border border-blue-200"
      >
        <h3 className="font-medium text-blue-800 mb-2">What happens next?</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Your crop submission will be reviewed by an administrator</li>
          <li>A quality agent will be assigned to inspect your crop</li>
          <li>After inspection, your crop will be approved or rejected</li>
          <li>Approved crops will be listed on the marketplace</li>
          <li>You'll be notified at each step of the process</li>
        </ol>
      </motion.div>
    </div>
  );
};
