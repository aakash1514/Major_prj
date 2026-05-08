import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../utils/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import CropCard from '../../components/common/CropCard';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { Crop } from '../../types';

export default function MyCropsScreen() {
  const router = useRouter();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch crops when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void fetchCrops();
    }, [])
  );

  const fetchCrops = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/farmer/crops') as Crop[];
      setCrops(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load crops';
      setError(message);
      console.error('Error fetching crops:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter crops based on search query
  const filteredCrops = useMemo(() => {
    if (!searchQuery.trim()) return crops;
    return crops.filter((crop) =>
      crop.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [crops, searchQuery]);

  const handleCropPress = (cropId: string) => {
    router.push('/(farmer)/my-crops');
  };

  const handleAddCrop = () => {
    router.push('/(farmer)/add-crop');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your crops..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Crops" />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={fetchCrops}
            variant="outline"
            size="sm"
            style={styles.retryButton}
          />
        </View>
      )}

      {/* Search Bar */}
      {crops.length > 0 && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crops by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {crops.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="leaf" size={64} color={Colors.primary} />
          <Text style={styles.emptyTitle}>No crops yet</Text>
          <Text style={styles.emptySubtitle}>
            Start adding your crops to get them listed on the marketplace
          </Text>
          <Button
            title="Add Your First Crop"
            onPress={handleAddCrop}
            variant="primary"
            size="md"
            style={styles.emptyButton}
          />
        </View>
      ) : filteredCrops.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No crops found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
          <Button
            title="Clear Search"
            onPress={() => setSearchQuery('')}
            variant="outline"
            size="md"
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <FlatList
          data={filteredCrops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cropCardWrapper}>
              <CropCard crop={item} onPress={() => handleCropPress(item.id)} />
            </View>
          )}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  cropCardWrapper: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 200,
  },
});
