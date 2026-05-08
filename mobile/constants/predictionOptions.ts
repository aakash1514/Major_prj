// Options sourced from ML assets:
// - Crop names from ml models/final.csv (Item column)
// - Regions from ml models/model3_service.py (REGION_OPTIONS)
// - Seasons aligned to model3 season context

export const ML_MODEL_CROP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Groundnuts', label: 'Groundnuts' },
  { value: 'Maize and products', label: 'Maize and products' },
  { value: 'Millet and products', label: 'Millet and products' },
  { value: 'Onions', label: 'Onions' },
  { value: 'Oranges', label: 'Oranges' },
  { value: 'Pepper', label: 'Pepper' },
  { value: 'Potatoes and products', label: 'Potatoes and products' },
  { value: 'Rice and products', label: 'Rice and products' },
  { value: 'Soyabeans', label: 'Soyabeans' },
  { value: 'Sugar cane', label: 'Sugar cane' },
  { value: 'Tomatoes and products', label: 'Tomatoes and products' },
  { value: 'Wheat and products', label: 'Wheat and products' },
];

export const ML_MODEL_LOCATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'North', label: 'North' },
  { value: 'South', label: 'South' },
  { value: 'East', label: 'East' },
  { value: 'West', label: 'West' },
  { value: 'Central', label: 'Central' },
  { value: 'North-East', label: 'North-East' },
  { value: 'North-West', label: 'North-West' },
];

export const ML_MODEL_SEASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Kharif', label: 'Kharif' },
  { value: 'Rabi', label: 'Rabi' },
  { value: 'Summer', label: 'Summer' },
  { value: 'Winter', label: 'Winter' },
  { value: 'Monsoon', label: 'Monsoon' },
  { value: 'All Year', label: 'All Year' },
];
