import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import {
  ML_MODEL_CROP_OPTIONS,
  ML_MODEL_LOCATION_OPTIONS,
  ML_MODEL_SEASON_OPTIONS,
} from '../../data/predictionOptions';
import { DemandPredictionInput, PricePredictionInput } from '../../types';

interface ManualPredictionForm {
  cropName: string;
  quantity: string;
  season: string;
  location: string;
}

export const PredictionsPage: React.FC = () => {
  const [formData, setFormData] = useState<ManualPredictionForm>({
    cropName: '',
    quantity: '',
    season: '',
    location: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<PricePredictionInput | null>(null);
  const [demandInput, setDemandInput] = useState<DemandPredictionInput | null>(null);

  const defaultHarvestDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleGeneratePredictions = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cropName = formData.cropName.trim();
    const location = formData.location.trim();
    const quantity = Number(formData.quantity);

    if (!cropName || !location || !formData.season || quantity <= 0) {
      setFormError('Please provide crop name, quantity, season, and location.');
      return;
    }

    setFormError(null);

    const nextPriceInput: PricePredictionInput = {
      cropName,
      quantity,
      unit: 'kg',
      harvestDate: defaultHarvestDate,
      location,
    };

    const nextDemandInput: DemandPredictionInput = {
      cropName,
      season: formData.season,
      region: location,
      quantity,
    };

    setPriceInput(nextPriceInput);
    setDemandInput(nextDemandInput);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold">Predictions</h1>
        <p className="mt-2">Enter crop details to view AI-powered price and demand estimates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Prediction Input</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleGeneratePredictions}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Crop Name"
                value={formData.cropName}
                onChange={(e) => setFormData((prev) => ({ ...prev, cropName: e.target.value }))}
                options={ML_MODEL_CROP_OPTIONS}
                fullWidth
              />

              <Input
                label="Quantity (kg)"
                type="number"
                min="1"
                placeholder="e.g., 500"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                fullWidth
              />

              <Select
                label="Season"
                value={formData.season}
                onChange={(e) => setFormData((prev) => ({ ...prev, season: e.target.value }))}
                options={ML_MODEL_SEASON_OPTIONS}
                fullWidth
              />

              <Select
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                options={ML_MODEL_LOCATION_OPTIONS}
                fullWidth
              />
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              Quantity unit guidance: enter quantity in <span className="font-semibold">kg</span> on this page.
              Price prediction is displayed directly as a market price, and quantity is used for total estimate where needed.
              Demand prediction outputs are based on model values in tonnes.
            </div>

            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Generate Predictions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {priceInput && demandInput && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PredictionPanel
            mode="price"
            inputData={priceInput}
            cropName={priceInput.cropName}
          />
          <PredictionPanel
            mode="demand"
            inputData={demandInput}
            cropName={demandInput.cropName}
          />
        </div>
      )}
    </div>
  );
};
