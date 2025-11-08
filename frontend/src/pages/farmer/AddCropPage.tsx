import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Upload, Check, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../store/authStore';
import { useCropsStore } from '../../store/cropsStore';
import { Crop } from '../../types';

interface AddCropFormData {
  name: string;
  quantity: number;
  unit: string;
  harvest_date: string;
  description: string;
  images: FileList;
  price: number;
  category: string;
}

export const AddCropPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addCrop } = useCropsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<AddCropFormData>();
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // In a real app, you would upload these files to a server
    // Here we'll just create local URLs for preview
    const imageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = URL.createObjectURL(files[i]);
      imageUrls.push(url);
    }
    
    setUploadedImages(imageUrls);
  };
  
  const onSubmit = async (data: AddCropFormData) => {
  if (!user) return;
  setIsSubmitting(true);

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
      images: uploadedImages
    };

    console.log('📤 Sending crop payload:', payload);

    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/crops', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                        accept="image/*"
                        {...register('images')}
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Uploaded image ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-md"
                      />
                      <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-full">
                        <Check size={12} />
                      </div>
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
         <form onSubmit={handleSubmit(onSubmit)} id="add-crop-form">
  {/* form fields */}

  <Button
    type="submit"
    disabled={isSubmitting}
  >
    Submit
  </Button>
</form>

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
