import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Crop } from '../../types';
import { API_URL } from '../../../../shared/apiConfig';

interface CropCardProps {
  crop: Crop;
  showActions?: boolean;
  linkTo?: string;
}

export const CropCard: React.FC<CropCardProps> = ({ 
  crop, 
  showActions = true,
  linkTo 
}) => {
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

  const imageSrc = resolveImageUrl(crop.images?.[0])
    || 'https://images.pexels.com/photos/601798/pexels-photo-601798.jpeg';

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-video overflow-hidden">
        <img 
          src={imageSrc} 
          alt={crop.name} 
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold">{crop.name}</h3>
          <StatusBadge status={crop.status} />
        </div>
        <p className="text-gray-600 mb-2 text-sm">{crop.description || 'No description available'}</p>
        <div className="mt-auto grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">Quantity</p>
            <p className="font-medium">{crop.quantity || 'N/A'} {crop.unit || ''}</p>
          </div>
          <div>
            <p className="text-gray-500">Harvest Date</p>
            <p className="font-medium">{crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString() : 'N/A'}</p>
          </div>
          {crop.price !== undefined && crop.price !== null ? (
            <div className="col-span-2 mt-2">
              <p className="text-gray-500">Price</p>
              <p className="font-semibold text-green-700">₹{parseFloat(crop.price as any).toFixed(2)} / {crop.unit}</p>
            </div>
          ) : (
            <div className="col-span-2 mt-2">
              <p className="text-gray-500">Price</p>
              <p className="font-semibold text-amber-700">Not set</p>
            </div>
          )}
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="flex justify-end space-x-2">
          {linkTo ? (
            <Link to={linkTo}>
              <Button variant="primary" size="sm">View Details</Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm">View Details</Button>
          )}
          {crop.status === 'listed' && (
            <Button variant="secondary" size="sm">Place Order</Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};