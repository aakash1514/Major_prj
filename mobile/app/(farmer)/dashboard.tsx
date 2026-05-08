import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CropCard from '../../components/common/CropCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PredictionPanel from '../../components/common/PredictionPanel';
import { Colors } from '../../constants/Colors';
import { Crop } from '../../types';

interface DashboardStats {
  totalCrops: number;
  pendingCrops: number;
  approvedCrops: number;
  totalOrders: number;
  recentCrops: Crop[];
}

interface FarmerProfile {
  crop_preference?: string;
  farm_size?: string;
  location?: string;
}

const encodeStringToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const buildDemandInputData = (primaryCropType: string, profile: FarmerProfile | null) => {
  const now = new Date();
  const farmSize = Number(profile?.farm_size || 0);
  const locationSeed = profile?.location || '';
  const cropSeed = encodeStringToNumber(primaryCropType.toLowerCase());
  const locationCode = encodeStringToNumber(locationSeed.toLowerCase());

  return {
    cropName: primaryCropType,
    season: 'Kharif',
    region: 'Central',
    quantity: Math.max(1, Math.round((Number.isFinite(farmSize) ? farmSize : 1) * 10)),
  };
};

const StatCard: React.FC<{
  label: string;
  value: number;
  color: string;
  icon?: string;
}> = ({ label, value, color, icon }) => (
  <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <CardContent style={styles.statCardContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </CardContent>
  </Card>
);

export default function FarmerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryCropType =
    profile?.crop_preference || stats?.recentCrops?.[0]?.name || 'Wheat';

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, profileData] = await Promise.all([
        api.get('/farmer/dashboard-stats') as Promise<DashboardStats>,
        api.get('/farmer/profile').catch(() => null) as Promise<FarmerProfile | null>,
      ]);

      setStats(statsData);
      setProfile(profileData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = () => {
    router.push('/(farmer)/add-crop');
  };

  const handleViewOrders = () => {
    router.push('/(farmer)/orders');
  };

  const handleViewPredictions = () => {
    router.push('/(shared)/predictions');
  };

  const handleCropPress = (cropId: string) => {
    router.push('/(farmer)/my-crops');
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Dashboard" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load dashboard'}</Text>
          <Button
            title="Try Again"
            onPress={fetchDashboardData}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dashboard" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome, {user?.name}</Text>
          <Text style={styles.welcomeDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCardWrapper}>
              <StatCard label="Total Crops" value={stats.totalCrops} color={Colors.primary} />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard label="Pending" value={stats.pendingCrops} color={Colors.warning} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCardWrapper}>
              <StatCard label="Approved" value={stats.approvedCrops} color={Colors.success} />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard label="Orders" value={stats.totalOrders} color={Colors.info} />
            </View>
          </View>
        </View>

        {/* Demand Prediction Widget */}
        {primaryCropType && (
          <PredictionPanel
            mode="demand"
            inputData={buildDemandInputData(primaryCropType, profile)}
            cropName={primaryCropType}
            style={styles.predictionPanel}
          />
        )}

        {/* Recent Crops Section */}
        {stats.recentCrops && stats.recentCrops.length > 0 && (
          <View style={styles.recentCropsSection}>
            <Text style={styles.sectionTitle}>Recent Crops</Text>
            <FlatList
              horizontal
              data={stats.recentCrops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.cropCardWrapper}>
                  <CropCard
                    crop={item}
                    onPress={() => handleCropPress(item.id)}
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionButtonWrapper}>
              <Button
                title="Add Crop"
                onPress={handleAddCrop}
                variant="primary"
                size="md"
              />
            </View>
            <View style={styles.actionButtonWrapper}>
              <Button
                title="View Orders"
                onPress={handleViewOrders}
                variant="secondary"
                size="md"
              />
            </View>
            <View style={styles.actionButtonWrapper}>
              <Button
                title="Predictions"
                onPress={handleViewPredictions}
                variant="outline"
                size="md"
              />
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
  },
  welcomeSection: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.surface,
    marginBottom: 4,
  },
  welcomeDate: {
    fontSize: 13,
    color: Colors.surface,
    opacity: 0.9,
  },
  statsGrid: {
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  statCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  predictionPanel: {
    marginBottom: 20,
  },
  recentCropsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  cropCardWrapper: {
    marginRight: 12,
    width: 160,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButtonWrapper: {
    flex: 1,
  },
  bottomPadding: {
    height: 20,
  },
});
