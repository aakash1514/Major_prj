import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CropCard from '../../components/common/CropCard';
import Button from '../../components/ui/Button';
import PredictionPanel from '../../components/common/PredictionPanel';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { Crop } from '../../types';
import { api } from '../../utils/api';

interface RecentOrderItem {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  crop_name: string;
  farmer_name: string;
}

interface FeaturedCropItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
  farmer_id: string;
  price: number;
  quantity?: number;
  unit?: string;
  images?: string[];
  description?: string;
}

interface DashboardStats {
  totalOrders: number;
  availableCrops: number;
  pendingDelivery: number;
  totalSpent: number;
  orderStatusBreakdown: Record<string, number>;
  recentOrders: RecentOrderItem[];
  featuredCrops: FeaturedCropItem[];
}

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const toMobileCrop = (crop: FeaturedCropItem): Crop => {
  return {
    id: crop.id,
    farmerId: crop.farmer_id || '',
    name: crop.name || 'Crop',
    quantity: Number(crop.quantity ?? 0),
    unit: crop.unit || 'kg',
    harvestDate: new Date(crop.created_at || Date.now()),
    images: crop.images || [],
    description: crop.description || '',
    status: (crop.status as Crop['status']) || 'approved',
    price: Number(crop.price ?? 0),
  };
};

const normalizeStats = (raw: any): DashboardStats => {
  return {
    totalOrders: Number(raw?.totalOrders ?? raw?.total_orders ?? 0),
    availableCrops: Number(raw?.availableCrops ?? raw?.available_crops ?? 0),
    pendingDelivery: Number(raw?.pendingDelivery ?? raw?.pending_delivery ?? 0),
    totalSpent: Number(raw?.totalSpent ?? raw?.total_spent ?? 0),
    orderStatusBreakdown: raw?.orderStatusBreakdown ?? raw?.order_status_breakdown ?? {},
    recentOrders: Array.isArray(raw?.recentOrders)
      ? raw.recentOrders
      : Array.isArray(raw?.recent_orders)
      ? raw.recent_orders
      : [],
    featuredCrops: Array.isArray(raw?.featuredCrops)
      ? raw.featuredCrops
      : Array.isArray(raw?.featured_crops)
      ? raw.featured_crops
      : [],
  };
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card style={styles.statCard}>
    <CardContent>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </CardContent>
  </Card>
);

export default function BuyerDashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get('/buyers/dashboard-stats');
      setStats(normalizeStats(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard statistics');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboardStats();
    }, [fetchDashboardStats])
  );

  const priceTrendCropTypes = useMemo(() => {
    if (!stats) return [] as string[];

    const orderedTypes = stats.recentOrders
      .map((order) => (order.crop_name || '').trim())
      .filter(Boolean);
    const featuredTypes = stats.featuredCrops
      .map((crop) => (crop.name || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...orderedTypes, ...featuredTypes]));
  }, [stats]);

  const primaryPriceTrendCrop = priceTrendCropTypes[0] || 'Mixed Crops';

  const priceTrendInputData = useMemo(() => {
    const now = new Date();
    const cropSeed = encodeStringToNumber(primaryPriceTrendCrop.toLowerCase());
    const buyerSeed = encodeStringToNumber((user?.name || 'buyer').toLowerCase());
    const marketSeed = encodeStringToNumber('marketplace');
    const arrivals = stats ? Math.max(0.1, Number((stats.availableCrops / 10).toFixed(2))) : 0.1;

    return {
      features: {
        'State Name': buyerSeed % 36,
        'District Name': buyerSeed % 64,
        'Market Name': marketSeed % 128,
        Variety: cropSeed % 200,
        Group: (cropSeed + marketSeed) % 40,
        Grade: ((stats?.pendingDelivery || 0) % 3) + 1,
        'Arrivals (Tonnes)': arrivals,
        Month: now.getMonth() + 1,
        Day: now.getDate(),
        Weekday: getWeekday(now),
      },
    };
  }, [primaryPriceTrendCrop, stats, user?.name]);

  const handleOpenPredictions = () => {
    router.push('/(shared)/predictions');
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dashboard" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard label="Total Orders" value={stats?.totalOrders || 0} />
            </View>
            <View style={styles.statsCol}>
              <StatCard label="Available Crops" value={stats?.availableCrops || 0} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard label="Pending Delivery" value={stats?.pendingDelivery || 0} />
            </View>
            <View style={styles.statsCol}>
              <StatCard
                label="Total Spent"
                value={`₹${(stats?.totalSpent || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              />
            </View>
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <View style={styles.quickActionButtonWrap}>
              <Button
                title="Marketplace"
                onPress={() => router.push('/(buyer)/marketplace')}
                variant="secondary"
                size="md"
              />
            </View>
            <View style={styles.quickActionButtonWrap}>
              <Button
                title="Predictions"
                onPress={handleOpenPredictions}
                variant="outline"
                size="md"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Trends</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your recent ordered and viewed crop types:{' '}
            {priceTrendCropTypes.slice(0, 3).join(', ') || 'No recent crop activity'}
          </Text>
          <PredictionPanel
            mode="price"
            inputData={priceTrendInputData}
            cropName={primaryPriceTrendCrop}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Featured Crops</Text>
            <TouchableOpacity onPress={() => router.push('/(buyer)/marketplace')}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          {stats?.featuredCrops?.length ? (
            <FlatList
              data={stats.featuredCrops}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <View style={styles.featuredCardWrap}>
                  <CropCard
                    crop={toMobileCrop(item)}
                    onPress={() => router.push('/(buyer)/marketplace')}
                  />
                </View>
              )}
            />
          ) : (
            <Card>
              <CardContent>
                <Text style={styles.mutedText}>No crops available in the marketplace yet.</Text>
              </CardContent>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {stats?.recentOrders?.length ? (
            stats.recentOrders.map((order) => (
              <Card key={order.id} style={styles.orderCard}>
                <CardContent>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderId}>#{order.id.slice(0, 6)}</Text>
                    <Text style={styles.orderStatus}>{order.status}</Text>
                  </View>
                  <Text style={styles.orderCrop}>{order.crop_name || 'Unknown Crop'}</Text>
                  <Text style={styles.orderMeta}>Farmer: {order.farmer_name || 'N/A'}</Text>
                  <Text style={styles.orderMeta}>
                    Amount: ₹{Number(order.total_amount || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent>
                <Text style={styles.mutedText}>You have not placed any orders yet.</Text>
              </CardContent>
            </Card>
          )}
        </View>
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
    gap: 16,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCol: {
    flex: 1,
  },
  statCard: {
    minHeight: 100,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingRight: 8,
  },
  featuredCardWrap: {
    width: 260,
    marginRight: 12,
  },
  mutedText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  orderCard: {
    marginBottom: 10,
  },
  quickActionsSection: {
    gap: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButtonWrap: {
    flex: 1,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  orderStatus: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderCrop: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
});
