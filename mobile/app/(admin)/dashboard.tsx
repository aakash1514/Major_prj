import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PredictionPanel from '../../components/common/PredictionPanel';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface DashboardStats {
  totalUsers: number;
  totalCrops: number;
  totalOrders: number;
  pendingCrops: number;
  approvedCrops: number;
  rejectedCrops: number;
  cropStatusBreakdown: Record<string, number>;
  orderStatusBreakdown: Record<string, number>;
  userRoleBreakdown: Record<string, number>;
  recentCrops: Array<{
    id: string;
    name: string;
    farmer_id: string;
    status: string;
    created_at: string;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    crop_name: string;
    buyer_name: string;
  }>;
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

const normalizeStats = (raw: any): DashboardStats => ({
  totalUsers: Number(raw?.totalUsers ?? raw?.total_users ?? 0),
  totalCrops: Number(raw?.totalCrops ?? raw?.total_crops ?? 0),
  totalOrders: Number(raw?.totalOrders ?? raw?.total_orders ?? 0),
  pendingCrops: Number(raw?.pendingCrops ?? raw?.pending_crops ?? 0),
  approvedCrops: Number(raw?.approvedCrops ?? raw?.approved_crops ?? 0),
  rejectedCrops: Number(raw?.rejectedCrops ?? raw?.rejected_crops ?? 0),
  cropStatusBreakdown: raw?.cropStatusBreakdown ?? raw?.crop_status_breakdown ?? {},
  orderStatusBreakdown: raw?.orderStatusBreakdown ?? raw?.order_status_breakdown ?? {},
  userRoleBreakdown: raw?.userRoleBreakdown ?? raw?.user_role_breakdown ?? {},
  recentCrops: Array.isArray(raw?.recentCrops)
    ? raw.recentCrops
    : Array.isArray(raw?.recent_crops)
    ? raw.recent_crops
    : [],
  recentOrders: Array.isArray(raw?.recentOrders)
    ? raw.recentOrders
    : Array.isArray(raw?.recent_orders)
    ? raw.recent_orders
    : [],
});

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card style={styles.statCard}>
    <CardContent>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </CardContent>
  </Card>
);

const mapOrderStatusBadge = (
  status: string
): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'delivered') return { variant: 'success', label: 'Delivered' };
  if (normalized === 'pending') return { variant: 'warning', label: 'Pending' };
  if (normalized === 'rejected' || normalized === 'cancelled') {
    return { variant: 'danger', label: normalized.charAt(0).toUpperCase() + normalized.slice(1) };
  }
  if (normalized === 'in-transit' || normalized === 'confirmed' || normalized === 'assigned') {
    return {
      variant: 'info',
      label: normalized
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    };
  }
  return {
    variant: 'default',
    label: status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : 'Unknown',
  };
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get('/admin/stats');
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

  const topActiveCrops = useMemo(() => {
    if (!stats) {
      return [] as Array<{
        id: string;
        name: string;
        activityScore: number;
        priceInputData: { features: Record<string, number> };
        demandInputData: { features: number[] };
      }>;
    }

    const orderCounts = stats.recentOrders.reduce<Record<string, number>>((acc, order) => {
      const key = (order.crop_name || '').trim().toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const uniqueCrops = new Map<string, DashboardStats['recentCrops'][number]>();
    stats.recentCrops.forEach((crop) => {
      const key = crop.name.trim().toLowerCase();
      if (!uniqueCrops.has(key)) {
        uniqueCrops.set(key, crop);
      }
    });

    return Array.from(uniqueCrops.values())
      .map((crop, index) => {
        const cropName = crop.name || `Crop ${index + 1}`;
        const cropSeed = encodeStringToNumber(cropName.toLowerCase());
        const createdDate = new Date(crop.created_at);
        const activityScore = orderCounts[cropName.trim().toLowerCase()] || 0;

        return {
          id: crop.id,
          name: cropName,
          activityScore,
          priceInputData: {
            features: {
              'State Name': cropSeed % 36,
              'District Name': cropSeed % 64,
              'Market Name': (cropSeed + stats.totalOrders) % 128,
              Variety: cropSeed % 200,
              Group: cropSeed % 40,
              Grade: (activityScore % 3) + 1,
              'Arrivals (Tonnes)': Math.max(0.1, Number((stats.totalCrops / 10).toFixed(2))),
              Month: Number.isNaN(createdDate.getTime()) ? 1 : createdDate.getMonth() + 1,
              Day: Number.isNaN(createdDate.getTime()) ? 1 : createdDate.getDate(),
              Weekday: Number.isNaN(createdDate.getTime()) ? 1 : getWeekday(createdDate),
            },
          },
          demandInputData: {
            features: [
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              new Date().getDate(),
              getWeekday(new Date()),
              cropSeed % 1000,
              stats.totalCrops,
              stats.pendingCrops,
              stats.approvedCrops,
              stats.rejectedCrops,
              stats.totalOrders,
              activityScore,
              (cropSeed + activityScore) % 500,
              stats.recentCrops.length,
              stats.recentOrders.length,
              (stats.orderStatusBreakdown.pending || 0) +
                (stats.orderStatusBreakdown.confirmed || 0),
              1,
            ],
          },
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 3);
  }, [stats]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Admin Dashboard" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.gridWrap}>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <StatCard label="Total Users" value={stats?.totalUsers || 0} />
            </View>
            <View style={styles.gridCol}>
              <StatCard label="Total Crops" value={stats?.totalCrops || 0} />
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <StatCard label="Total Orders" value={stats?.totalOrders || 0} />
            </View>
            <View style={styles.gridCol}>
              <StatCard label="Pending Crops" value={stats?.pendingCrops || 0} />
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <StatCard label="Approved Crops" value={stats?.approvedCrops || 0} />
            </View>
            <View style={styles.gridCol}>
              <StatCard label="Rejected Crops" value={stats?.rejectedCrops || 0} />
            </View>
          </View>
        </View>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>AI Market Analytics</Text>
            <Text style={styles.sectionSubtitle}>
              Price and demand projections for the top 3 most active crops.
            </Text>
          </CardHeader>
          <CardContent>
            {topActiveCrops.length ? (
              topActiveCrops.map((crop) => (
                <View key={crop.id} style={styles.analyticsCropBlock}>
                  <View style={styles.analyticsHeadRow}>
                    <Text style={styles.analyticsCropName}>{crop.name}</Text>
                    <Badge label={`Activity ${crop.activityScore}`} variant="info" />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.analyticsScrollRow}
                  >
                    <View style={styles.analyticsPanelWrap}>
                      <PredictionPanel mode="price" inputData={crop.priceInputData} cropName={crop.name} />
                    </View>
                    <View style={styles.analyticsPanelWrap}>
                      <PredictionPanel
                        mode="demand"
                        inputData={crop.demandInputData}
                        cropName={crop.name}
                      />
                    </View>
                  </ScrollView>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No crop activity available yet for analytics.</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>Recent Crops</Text>
          </CardHeader>
          <CardContent>
            {stats?.recentCrops?.length ? (
              stats.recentCrops.map((crop) => (
                <View key={crop.id} style={styles.listItem}>
                  <View style={styles.listItemMain}>
                    <Text style={styles.listItemTitle}>{crop.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {new Date(crop.created_at).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <StatusBadge status={crop.status as any} />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent crops available.</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders?.length ? (
              stats.recentOrders.map((order) => {
                const statusBadge = mapOrderStatusBadge(order.status);
                return (
                  <View key={order.id} style={styles.listItem}>
                    <View style={styles.listItemMain}>
                      <Text style={styles.listItemTitle}>{order.crop_name || 'Unknown Crop'}</Text>
                      <Text style={styles.listItemMeta}>
                        Buyer: {order.buyer_name || 'N/A'} |{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    <Badge label={statusBadge.label} variant={statusBadge.variant} />
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No recent orders available.</Text>
            )}
          </CardContent>
        </Card>

        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLinkBtn}
            onPress={() => router.push('/(admin)/crop-submissions')}
          >
            <Text style={styles.quickLinkText}>Crop Submissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLinkBtn} onPress={() => router.push('/(admin)/orders')}>
            <Text style={styles.quickLinkText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLinkBtn} onPress={() => router.push('/(admin)/users')}>
            <Text style={styles.quickLinkText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkBtn}
            onPress={() => router.push('/(shared)/predictions')}
          >
            <Text style={styles.quickLinkText}>Predictions</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <CardContent>
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="danger"
              size="md"
            />
          </CardContent>
        </Card>
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
  errorBox: {
    marginBottom: 12,
    backgroundColor: '#fef2f2',
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  gridWrap: {
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  statCard: {
    minHeight: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  analyticsCropBlock: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  analyticsHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  analyticsCropName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  analyticsScrollRow: {
    gap: 10,
    paddingRight: 6,
  },
  analyticsPanelWrap: {
    width: 320,
  },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  listItemMain: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  listItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickLinksRow: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  quickLinkBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
