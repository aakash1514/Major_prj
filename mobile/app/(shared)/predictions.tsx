import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenHeader from '../../components/common/ScreenHeader';
import { PredictionPanel } from '../../components/common/PredictionPanel';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Colors } from '../../constants/Colors';
import {
  ML_MODEL_CROP_OPTIONS,
  ML_MODEL_LOCATION_OPTIONS,
  ML_MODEL_SEASON_OPTIONS,
} from '../../constants/predictionOptions';
import { usePredictionsStore } from '../../store/predictionsStore';
import { DemandPredictionInput, PricePredictionInput } from '../../types';

type PredictionTab = 'price' | 'demand';

const UNIT_OPTIONS = [
  { label: 'kg', value: 'kg' },
  { label: 'quintal', value: 'quintal' },
  { label: 'tonne', value: 'tonne' },
];

const defaultHarvestDate = new Date().toISOString().slice(0, 10);

export default function PredictionsScreen() {
  const [activeTab, setActiveTab] = useState<PredictionTab>('price');

  const [priceForm, setPriceForm] = useState({
    cropName: '',
    quantity: '',
    unit: 'kg',
    harvestDate: defaultHarvestDate,
    location: '',
  });
  const [demandForm, setDemandForm] = useState({
    cropName: '',
    season: '',
    region: '',
    quantity: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState<PricePredictionInput | null>(null);
  const [submittedDemand, setSubmittedDemand] = useState<DemandPredictionInput | null>(null);

  const { fetchPricePrediction, fetchDemandPrediction } = usePredictionsStore();

  const activeLabel = useMemo(
    () => (activeTab === 'price' ? 'Price Prediction' : 'Demand Prediction'),
    [activeTab]
  );

  const submitPricePrediction = async () => {
    const cropName = priceForm.cropName.trim();
    const location = priceForm.location.trim();
    const quantity = Number(priceForm.quantity);

    if (!cropName || !location || !priceForm.harvestDate || Number.isNaN(quantity) || quantity <= 0) {
      setFormError('Please provide crop name, quantity, harvest date, and location.');
      return;
    }

    const payload: PricePredictionInput = {
      cropName,
      quantity,
      unit: priceForm.unit,
      harvestDate: priceForm.harvestDate,
      location,
    };

    setFormError(null);
    setSubmittedDemand(null);
    setSubmittedPrice(payload);
    await fetchPricePrediction(payload);
  };

  const submitDemandPrediction = async () => {
    const cropName = demandForm.cropName.trim();
    const region = demandForm.region.trim();
    const quantity = Number(demandForm.quantity);

    if (!cropName || !region || !demandForm.season || Number.isNaN(quantity) || quantity <= 0) {
      setFormError('Please provide crop name, quantity, season, and region.');
      return;
    }

    const payload: DemandPredictionInput = {
      cropName,
      season: demandForm.season,
      region,
      quantity,
    };

    setFormError(null);
    setSubmittedPrice(null);
    setSubmittedDemand(payload);
    await fetchDemandPrediction(payload);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="AI Predictions" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.toggleCard}>
          <CardHeader>
            <Text style={styles.sectionTitle}>{activeLabel}</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.tabRow}>
              {([
                { key: 'price', label: 'Price' },
                { key: 'demand', label: 'Demand' },
              ] as const).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.tabPill, active && styles.tabPillActive]}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardContent>
        </Card>

        {formError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        {activeTab === 'price' ? (
          <Card>
            <CardHeader>
              <Text style={styles.sectionTitle}>Price Estimate</Text>
            </CardHeader>
            <CardContent>
              <Input
                label="Crop Name"
                value={priceForm.cropName}
                onChangeText={(value) => setPriceForm((prev) => ({ ...prev, cropName: value }))}
                placeholder="Enter crop name"
              />

              <Input
                label="Quantity"
                value={priceForm.quantity}
                onChangeText={(value) => setPriceForm((prev) => ({ ...prev, quantity: value }))}
                placeholder="Enter quantity"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Unit</Text>
              <Select
                value={priceForm.unit}
                onValueChange={(value) => setPriceForm((prev) => ({ ...prev, unit: value }))}
                options={UNIT_OPTIONS}
                placeholder="Select unit"
              />

              <Input
                label="Harvest Date"
                value={priceForm.harvestDate}
                onChangeText={(value) => setPriceForm((prev) => ({ ...prev, harvestDate: value }))}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Location"
                value={priceForm.location}
                onChangeText={(value) => setPriceForm((prev) => ({ ...prev, location: value }))}
                placeholder="Enter location"
              />

              <Button title="Get Price Estimate" onPress={() => { void submitPricePrediction(); }} />

              {submittedPrice ? (
                <View style={styles.resultWrap}>
                  <PredictionPanel
                    mode="price"
                    inputData={submittedPrice}
                    cropName={submittedPrice.cropName}
                  />
                </View>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <Text style={styles.sectionTitle}>Demand Estimate</Text>
            </CardHeader>
            <CardContent>
              <Text style={styles.fieldLabel}>Crop Name</Text>
              <Select
                value={demandForm.cropName}
                onValueChange={(value) => setDemandForm((prev) => ({ ...prev, cropName: value }))}
                options={ML_MODEL_CROP_OPTIONS}
                placeholder="Select crop"
              />

              <Text style={styles.fieldLabel}>Season</Text>
              <Select
                value={demandForm.season}
                onValueChange={(value) => setDemandForm((prev) => ({ ...prev, season: value }))}
                options={ML_MODEL_SEASON_OPTIONS}
                placeholder="Select season"
              />

              <Text style={styles.fieldLabel}>Region</Text>
              <Select
                value={demandForm.region}
                onValueChange={(value) => setDemandForm((prev) => ({ ...prev, region: value }))}
                options={ML_MODEL_LOCATION_OPTIONS}
                placeholder="Select region"
              />

              <Input
                label="Quantity"
                value={demandForm.quantity}
                onChangeText={(value) => setDemandForm((prev) => ({ ...prev, quantity: value }))}
                placeholder="Enter quantity"
                keyboardType="numeric"
              />

              <Button title="Get Demand Estimate" onPress={() => { void submitDemandPrediction(); }} />

              {submittedDemand ? (
                <View style={styles.resultWrap}>
                  <PredictionPanel
                    mode="demand"
                    inputData={submittedDemand}
                    cropName={submittedDemand.cropName}
                  />
                </View>
              ) : null}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  toggleCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.surface,
  },
  errorBox: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: '#fef2f2',
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  resultWrap: {
    marginTop: 16,
  },
});
