import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import { useAuthStore } from '../../store/authStore';

interface Crop {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  status: string;
  image_url?: string;
  images?: string[];
  farmer_id: string;
  created_at?: string;
}

interface FarmerInfo {
  id: string;
  name: string;
  email: string;
  location?: string;
  contact_number?: string;
}

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getCategoryLabel = (category: string) => {
  if (category === 'all') return 'All Categories';
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
};

export const MarketplacePage: React.FC = () => {
  const { user } = useAuthStore();
  const [listedCrops, setListedCrops] = useState<Crop[]>([]);
  const [farmerInfo, setFarmerInfo] = useState<Map<string, FarmerInfo>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showMarketInsights, setShowMarketInsights] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: 'all',
  });

  const marketInsightCropLabel = getCategoryLabel(filters.category);

  const marketDemandInput = useMemo(() => {
    const matchingCrops = listedCrops.filter((crop) => {
      if (searchTerm && !crop.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !crop.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      if (filters.minPrice && crop.price && crop.price < parseInt(filters.minPrice, 10)) {
        return false;
      }

      if (filters.maxPrice && crop.price && crop.price > parseInt(filters.maxPrice, 10)) {
        return false;
      }

      if (filters.category !== 'all') {
        const isMatch = crop.name.toLowerCase().includes(filters.category.toLowerCase());
        if (!isMatch) return false;
      }

      return true;
    });

    const avgPrice = matchingCrops.length
      ? matchingCrops.reduce((sum, crop) => sum + (crop.price || 0), 0) / matchingCrops.length
      : 0;
    const totalQuantity = matchingCrops.reduce((sum, crop) => sum + (crop.quantity || 0), 0);
    const categorySeed = encodeStringToNumber(filters.category);
    const searchSeed = encodeStringToNumber(searchTerm.toLowerCase());
    const now = new Date();

    return {
      features: [
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getDay() || 7,
        categorySeed % 1000,
        searchSeed % 500,
        matchingCrops.length,
        Number(avgPrice.toFixed(2)),
        parseInt(filters.minPrice || '0', 10) || 0,
        parseInt(filters.maxPrice || '0', 10) || 0,
        listedCrops.length,
        matchingCrops.filter((crop) => (crop.price || 0) > avgPrice).length,
        matchingCrops.filter((crop) => (crop.price || 0) <= avgPrice).length,
        totalQuantity,
        Number((matchingCrops.length ? totalQuantity / matchingCrops.length : 0).toFixed(2)),
        1,
      ],
    };
  }, [filters.category, filters.maxPrice, filters.minPrice, listedCrops, searchTerm]);

  // Fetch crops on mount
  useEffect(() => {
    fetchListedCrops();
  }, []);

  const fetchListedCrops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/crops', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch crops:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📥 Fetched all crops:', data);
      
      // Filter only listed crops
      const crops = Array.isArray(data) ? data : data.crops || [];
      const listed = crops.filter((crop: Crop) => crop.status === 'listed');
      setListedCrops(listed);

      // Fetch farmer info for each crop
      for (const crop of listed) {
        fetchFarmerInfo(crop.farmer_id);
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
    }
  };

  const fetchFarmerInfo = async (farmerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${farmerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const farmer = await response.json();
        setFarmerInfo(prev => new Map(prev).set(farmerId, farmer));
      }
    } catch (error) {
      console.error('Error fetching farmer info:', error);
    }
  };
  
  // Apply filters and search
  const filteredCrops = listedCrops.filter(crop => {
    // Search filter
    if (searchTerm && !crop.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !crop.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Price filter
    if (filters.minPrice && crop.price && crop.price < parseInt(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && crop.price && crop.price > parseInt(filters.maxPrice)) {
      return false;
    }
    
    // Category filter - in a real app, you'd have proper categorization
    if (filters.category !== 'all') {
      // This is just a placeholder for demonstration
      const isMatch = crop.name.toLowerCase().includes(filters.category.toLowerCase());
      if (!isMatch) return false;
    }
    
    return true;
  });
  
  // Sort crops
  const sortedCrops = [...filteredCrops].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
      default:
        // This would normally sort by listing date
        return 0;
    }
  });

  const handlePlaceOrder = async (crop: Crop) => {
    if (!user || user.role !== 'buyer') {
      alert('Only buyers can place orders. Please log in as a buyer.');
      return;
    }

    if (orderQuantity <= 0 || orderQuantity > crop.quantity) {
      alert(`Please enter a valid quantity (1-${crop.quantity})`);
      return;
    }

    try {
      setIsPlacingOrder(true);
      const token = localStorage.getItem('token');
      const totalAmount = (crop.price || 0) * orderQuantity;

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cropId: crop.id,
          quantity: orderQuantity,
          advanceAmount: advanceAmount || 0,
          totalAmount: totalAmount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Order created:', data);
        alert('Order placed successfully!');
        setSelectedCrop(null);
        setOrderQuantity(1);
        setAdvanceAmount(0);
        // Refresh orders if needed
      } else {
        const error = await response.json();
        console.error('Failed to create order:', error);
        alert('Failed to place order: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Agricultural Marketplace</h1>
        <p className="mt-2">Browse high-quality produce directly from farmers.</p>
      </div>

      <Card className="border border-amber-200">
        <CardContent className="p-0">
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-50 transition-colors"
            onClick={() => setShowMarketInsights((prev) => !prev)}
          >
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Market Insights</h2>
              <p className="text-sm text-amber-700">Predicted demand for the current crop filter</p>
            </div>
            {showMarketInsights ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showMarketInsights && (
            <div className="p-4 pt-0">
              <PredictionPanel
                mode="demand"
                inputData={marketDemandInput}
                cropName={marketInsightCropLabel}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow">
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
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'price-low', label: 'Price: Low to High' },
              { value: 'price-high', label: 'Price: High to Low' },
              { value: 'name', label: 'Name' },
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-48"
          />
          
          <Button 
            variant="outline" 
            onClick={toggleFilters}
            icon={<SlidersHorizontal size={16} />}
          >
            Filters
          </Button>
        </div>
      </div>
      
      {/* Expanded filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Filter size={18} className="text-gray-500" />
                  <h3 className="font-medium">Filters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
                  <Input
                    label="Min Price ($)"
                    type="number"
                    name="minPrice"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                  />
                  
                  <Input
                    label="Max Price ($)"
                    type="number"
                    name="maxPrice"
                    placeholder="1000"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                  />
                  
                  <Select
                    label="Category"
                    name="category"
                    options={[
                      { value: 'all', label: 'All Categories' },
                      { value: 'vegetable', label: 'Vegetables' },
                      { value: 'fruit', label: 'Fruits' },
                      { value: 'grain', label: 'Grains' },
                      { value: 'organic', label: 'Organic' },
                    ]}
                    value={filters.category}
                    onChange={handleFilterChange}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({ minPrice: '', maxPrice: '', category: 'all' })}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Results */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Available Crops</h2>
          <span className="text-gray-500">{sortedCrops.length} results</span>
        </div>
        
        {sortedCrops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCrops.map((crop) => {
              const farmer = farmerInfo.get(crop.farmer_id);
              return (
                <motion.div
                  key={crop.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                    {/* Crop Image */}
                    <div className="w-full h-48 bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center overflow-hidden">
                      {crop.image_url ? (
                        <img src={crop.image_url} alt={crop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-green-700">
                          <div className="text-4xl">🌱</div>
                          <p className="text-sm">{crop.name}</p>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 flex-1 flex flex-col">
                      {/* Crop Info */}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{crop.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{crop.description}</p>

                      {/* Farmer Info */}
                      {farmer && (
                        <div className="mb-3 p-2 bg-blue-50 rounded">
                          <p className="text-xs text-gray-700"><strong>Farmer:</strong> {farmer.name}</p>
                          <p className="text-xs text-gray-600">{farmer.location || 'Location not specified'}</p>
                        </div>
                      )}

                      {/* Price and Quantity */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Price per {crop.unit}</p>
                          <p className="font-bold text-lg text-green-700">₹{crop.price ? crop.price.toFixed(2) : '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Available</p>
                          <p className="font-bold text-lg text-blue-700">{crop.quantity} {crop.unit}</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedCrop(crop.id)}
                        fullWidth
                        className="mt-auto"
                      >
                        Place Order
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">No crops match your search criteria.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilters({ minPrice: '', maxPrice: '', category: 'all' });
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Order Placement Modal */}
      {selectedCrop && listedCrops.find(c => c.id === selectedCrop) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          {(() => {
            const crop = listedCrops.find(c => c.id === selectedCrop);
            if (!crop) return null;
            const totalAmount = (crop.price || 0) * orderQuantity;

            return (
              <Card className="max-w-md w-full">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Place Order</h2>
                    <button
                      onClick={() => setSelectedCrop(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Crop Details */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900">{crop.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{crop.description}</p>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity ({crop.unit})
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max={crop.quantity}
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        fullWidth
                      />
                      <p className="text-xs text-gray-500 mt-1">Available: {crop.quantity} {crop.unit}</p>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Price per {crop.unit}:</span>
                        <span className="font-medium">₹{crop.price ? crop.price.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Quantity:</span>
                        <span className="font-medium">{orderQuantity}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-base font-bold text-green-700">
                        <span>Total Amount:</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Advance Payment (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Advance Payment (Optional)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={totalAmount}
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        fullWidth
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Balance due: ₹{(totalAmount - advanceAmount).toFixed(2)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCrop(null)}
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handlePlaceOrder(crop)}
                        disabled={isPlacingOrder}
                        fullWidth
                      >
                        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
};