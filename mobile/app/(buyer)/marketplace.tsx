import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CropCard from '../../components/common/CropCard';
import PredictionPanel from '../../components/common/PredictionPanel';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { Crop } from '../../types';
import { api } from '../../utils/api';

interface FarmerInfo {
  id: string;
  name: string;
  email: string;
  location?: string;
  contact_number?: string;
}

interface ApiCrop {
  id: string;
  farmer_id: string;
  name: string;
  quantity: number;
  unit: string;
  harvest_date?: string;
  images?: string[];
  description?: string;
  status: string;
  price?: number;
  tac?: string;
  created_at?: string;
}

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'vegetable', label: 'Vegetables' },
  { key: 'grain', label: 'Grains' },
  { key: 'fruit', label: 'Fruits' },
  { key: 'pulse', label: 'Pulses' },
  { key: 'spice', label: 'Spices' },
  { key: 'organic', label: 'Organic' },
];

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getCategoryLabel = (category: string) => {
  if (category === 'all') return 'All Categories';
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
};

const mapCrop = (crop: ApiCrop): Crop => ({
  id: crop.id,
  farmerId: crop.farmer_id,
  name: crop.name,
  quantity: Number(crop.quantity || 0),
  unit: crop.unit || 'kg',
  harvestDate: crop.harvest_date ? new Date(crop.harvest_date) : new Date(),
  images: Array.isArray(crop.images) ? crop.images : [],
  description: crop.description || '',
  status: (crop.status as Crop['status']) || 'listed',
  price: Number(crop.price || 0),
  tac: crop.tac || '',
});

export default function MarketplaceScreen() {
  const [listedCrops, setListedCrops] = useState<Crop[]>([]);
  const [rawListedCrops, setRawListedCrops] = useState<ApiCrop[]>([]);
  const [farmerInfo, setFarmerInfo] = useState<Map<string, FarmerInfo>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showMarketInsights, setShowMarketInsights] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<ApiCrop | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFarmerInfo = useCallback(async (farmerId: string) => {
    if (!farmerId || farmerInfo.has(farmerId)) return;
    try {
      const farmer = (await api.get(`/users/${farmerId}`)) as FarmerInfo;
      setFarmerInfo((prev) => new Map(prev).set(farmerId, farmer));
    } catch {
      // Farmer info is optional for card rendering.
    }
  }, [farmerInfo]);

  const fetchListedCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get('/crops');
      const crops = Array.isArray(data)
        ? (data as ApiCrop[])
        : Array.isArray((data as { crops?: ApiCrop[] })?.crops)
        ? ((data as { crops: ApiCrop[] }).crops)
        : [];

      const listed = crops.filter((crop) => crop.status === 'listed');
      setRawListedCrops(listed);
      setListedCrops(listed.map(mapCrop));

      listed.forEach((crop) => {
        void fetchFarmerInfo(crop.farmer_id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace crops');
      setRawListedCrops([]);
      setListedCrops([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFarmerInfo]);

  useFocusEffect(
    useCallback(() => {
      void fetchListedCrops();
    }, [fetchListedCrops])
  );

  const filteredRawCrops = useMemo(() => {
    return rawListedCrops.filter((crop) => {
      const name = (crop.name || '').toLowerCase();
      const description = (crop.description || '').toLowerCase();
      const tac = (crop.tac || '').toLowerCase();

      if (
        searchTerm &&
        !name.includes(searchTerm.toLowerCase()) &&
        !description.includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      if (selectedCategory !== 'all') {
        const category = selectedCategory.toLowerCase();
        const pluralCategory = `${category}s`;
        const matched =
          name.includes(category) ||
          name.includes(pluralCategory) ||
          tac.includes(category) ||
          tac.includes(pluralCategory);
        if (!matched) return false;
      }

      return true;
    });
  }, [rawListedCrops, searchTerm, selectedCategory]);

  const filteredCrops = useMemo(() => filteredRawCrops.map(mapCrop), [filteredRawCrops]);

  const marketInsightCropLabel = getCategoryLabel(selectedCategory);

  const marketDemandInput = useMemo(() => {
    const matchingCrops = filteredRawCrops;
    const avgPrice = matchingCrops.length
      ? matchingCrops.reduce((sum, crop) => sum + Number(crop.price || 0), 0) / matchingCrops.length
      : 0;
    const totalQuantity = matchingCrops.reduce(
      (sum, crop) => sum + Number(crop.quantity || 0),
      0
    );
    const categorySeed = encodeStringToNumber(selectedCategory);
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
        0,
        0,
        rawListedCrops.length,
        matchingCrops.filter((crop) => Number(crop.price || 0) > avgPrice).length,
        matchingCrops.filter((crop) => Number(crop.price || 0) <= avgPrice).length,
        totalQuantity,
        Number(
          (matchingCrops.length ? totalQuantity / matchingCrops.length : 0).toFixed(2)
        ),
        1,
      ],
    };
  }, [filteredRawCrops, rawListedCrops.length, searchTerm, selectedCategory]);

  const selectedFarmer = selectedCrop ? farmerInfo.get(selectedCrop.farmer_id) : null;

  const placeOrder = async () => {
    if (!selectedCrop) return;

    const quantity = Number(orderQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(selectedCrop.quantity || 0)) {
      Alert.alert('Invalid quantity', `Enter a value between 1 and ${selectedCrop.quantity}`);
      return;
    }

    try {
      setIsPlacingOrder(true);
      const totalAmount = Number(selectedCrop.price || 0) * quantity;

      await api.post('/orders', {
        cropId: selectedCrop.id,
        quantity,
        totalAmount,
      });

      Alert.alert('Order placed', 'Your order has been created successfully.');
      setIsOrderMode(false);
      setSelectedCrop(null);
      setOrderQuantity('1');
    } catch (err) {
      Alert.alert('Order failed', err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading marketplace..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Marketplace" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search crops..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORY_OPTIONS.map((option) => {
          const active = selectedCategory === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setSelectedCategory(option.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.insightsWrap}>
        <TouchableOpacity
          style={styles.insightsToggle}
          onPress={() => setShowMarketInsights((prev) => !prev)}
        >
          <Text style={styles.insightsToggleText}>Market Insights</Text>
          <Text style={styles.insightsToggleHint}>{showMarketInsights ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
        {showMarketInsights ? (
          <PredictionPanel
            mode="demand"
            inputData={marketDemandInput}
            cropName={marketInsightCropLabel}
          />
        ) : null}
      </View>

      <FlatList
        data={filteredCrops}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No crops match the selected filters.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <CropCard
              crop={item}
              onPress={() => {
                const raw = rawListedCrops.find((crop) => crop.id === item.id) || null;
                setSelectedCrop(raw);
                setIsOrderMode(false);
                setOrderQuantity('1');
              }}
            />
          </View>
        )}
      />

      <Modal
        visible={Boolean(selectedCrop)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedCrop(null);
          setIsOrderMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setSelectedCrop(null);
              setIsOrderMode(false);
            }}
          />
          {selectedCrop ? (
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              {selectedCrop.images?.[0] ? (
                <Image source={{ uri: selectedCrop.images[0] }} style={styles.sheetImage} />
              ) : (
                <View style={[styles.sheetImage, styles.sheetImagePlaceholder]}>
                  <Text style={styles.sheetImagePlaceholderText}>
                    {selectedCrop.name?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                </View>
              )}

              <Text style={styles.sheetTitle}>{selectedCrop.name}</Text>
              <Text style={styles.sheetDescription}>
                {selectedCrop.description || 'No description provided.'}
              </Text>

              <View style={styles.sheetMetaRow}>
                <Text style={styles.sheetMetaLabel}>Farmer</Text>
                <Text style={styles.sheetMetaValue}>{selectedFarmer?.name || 'Unknown'}</Text>
              </View>
              <View style={styles.sheetMetaRow}>
                <Text style={styles.sheetMetaLabel}>Location</Text>
                <Text style={styles.sheetMetaValue}>{selectedFarmer?.location || 'N/A'}</Text>
              </View>
              <View style={styles.sheetMetaRow}>
                <Text style={styles.sheetMetaLabel}>Price</Text>
                <Text style={styles.sheetMetaValue}>
                  ₹{Number(selectedCrop.price || 0).toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.sheetMetaRow}>
                <Text style={styles.sheetMetaLabel}>Available Qty</Text>
                <Text style={styles.sheetMetaValue}>
                  {selectedCrop.quantity} {selectedCrop.unit}
                </Text>
              </View>

              {!isOrderMode ? (
                <TouchableOpacity style={styles.orderButton} onPress={() => setIsOrderMode(true)}>
                  <Text style={styles.orderButtonText}>Order</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.orderForm}>
                  <Input
                    label="Order Quantity"
                    keyboardType="numeric"
                    value={orderQuantity}
                    onChangeText={setOrderQuantity}
                    placeholder="Enter quantity"
                  />
                  <Text style={styles.orderAmount}>
                    Total: ₹
                    {(
                      Number(selectedCrop.price || 0) * (Number(orderQuantity) || 0)
                    ).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <View style={styles.orderActionRow}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.orderActionButton]}
                      onPress={() => setIsOrderMode(false)}
                      disabled={isPlacingOrder}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.orderButton, styles.orderActionButton]}
                      onPress={() => {
                        void placeOrder();
                      }}
                      disabled={isPlacingOrder}
                    >
                      <Text style={styles.orderButtonText}>
                        {isPlacingOrder ? 'Placing...' : 'Confirm Order'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.surface,
  },
  insightsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  insightsToggle: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  insightsToggleHint: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 26,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 10,
  },
  gridItem: {
    width: '48%',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  sheetImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  sheetImagePlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetImagePlaceholderText: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.surface,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sheetDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetMetaLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sheetMetaValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  orderButton: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  orderButtonText: {
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  orderForm: {
    marginTop: 10,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  orderActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  orderActionButton: {
    flex: 1,
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
