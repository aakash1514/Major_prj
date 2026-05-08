import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  location?: string;
  contact_number?: string;
  profile_image?: string;
  buyerDetails?: {
    company_name?: string;
    business_type?: string;
    preferences?: string | string[];
  };
}

interface BuyerOrder {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface EditFormData {
  name: string;
  location: string;
  contactNumber: string;
  companyName: string;
  businessType: string;
  preferences: string;
}

const parsePreferences = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function BuyerProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    defaultValues: {
      name: '',
      location: '',
      contactNumber: '',
      companyName: '',
      businessType: '',
      preferences: '',
    },
  });

  const fetchProfileAndOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, ordersRes] = await Promise.all([
        api.get('/buyers/profile') as Promise<BuyerProfile>,
        api.get('/buyers/orders').catch(() => [] as BuyerOrder[]),
      ]);

      const normalizedOrders = Array.isArray(ordersRes)
        ? ordersRes
        : ([] as BuyerOrder[]);

      setProfile(profileRes);
      setOrders(normalizedOrders);
      setProfileImage(profileRes.profile_image);

      const prefs = parsePreferences(profileRes?.buyerDetails?.preferences).join(', ');
      reset({
        name: profileRes.name || '',
        location: profileRes.location || '',
        contactNumber: profileRes.contact_number || '',
        companyName: profileRes?.buyerDetails?.company_name || '',
        businessType: profileRes?.buyerDetails?.business_type || '',
        preferences: prefs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      void fetchProfileAndOrders();
    }, [fetchProfileAndOrders])
  );

  const purchaseSummary = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );
    const deliveredOrders = orders.filter((order) => order.status === 'delivered').length;
    const latestOrder = orders[0]?.created_at;

    return {
      totalOrders,
      deliveredOrders,
      totalSpent,
      latestOrder,
    };
  }, [orders]);

  const preferences = parsePreferences(profile?.buyerDetails?.preferences);

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.cancelled && result.assets?.[0]?.base64) {
        setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch {
      Alert.alert('Image Error', 'Could not select image.');
    }
  };

  const onSave = async (data: EditFormData) => {
    try {
      setIsSaving(true);

      await api.put('/buyers/profile', {
        name: data.name,
        location: data.location,
        contactNumber: data.contactNumber,
        profileImage: profileImage || '',
        companyName: data.companyName,
        businessType: data.businessType,
        preferences: data.preferences,
      });

      Alert.alert('Success', 'Profile updated successfully.');
      setEditVisible(false);
      void fetchProfileAndOrders();
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Profile"
        rightAction={{
          label: 'Edit',
          onPress: () => setEditVisible(true),
        }}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <CardContent style={styles.profileHeaderContent}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {(profile?.name || 'B').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.name}>{profile?.name || 'Buyer'}</Text>
            <Text style={styles.email}>{profile?.email || 'N/A'}</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>Business Profile</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Company Name</Text>
              <Text style={styles.infoValue}>
                {profile?.buyerDetails?.company_name || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Business Type</Text>
              <Text style={styles.infoValue}>
                {profile?.buyerDetails?.business_type || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{profile?.location || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>{profile?.contact_number || 'Not provided'}</Text>
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.chipWrap}>
              {preferences.length ? (
                preferences.map((pref) => (
                  <Badge key={pref} label={pref} variant="info" style={styles.prefChip} />
                ))
              ) : (
                <Text style={styles.mutedText}>No preferences added yet.</Text>
              )}
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.sectionTitle}>Purchase History Summary</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{purchaseSummary.totalOrders}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{purchaseSummary.deliveredOrders}</Text>
                <Text style={styles.summaryLabel}>Delivered</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCardWide}>
                <Text style={styles.summaryValue}>
                  ₹{purchaseSummary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.summaryLabel}>Total Spent</Text>
              </View>
            </View>
            <Text style={styles.latestOrderText}>
              Latest order:{' '}
              {purchaseSummary.latestOrder
                ? new Date(purchaseSummary.latestOrder).toLocaleDateString('en-IN')
                : 'No orders yet'}
            </Text>
          </CardContent>
        </Card>

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

      <Modal
        visible={editVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.modalRightSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.imageEditWrap}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {(profile?.name || 'B').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Button title="Change Photo" variant="outline" size="sm" onPress={pickProfileImage} />
            </View>

            <Controller
              control={control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field: { value, onChange } }) => (
                <Input label="Location" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="contactNumber"
              render={({ field: { value, onChange } }) => (
                <Input label="Contact Number" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="companyName"
              render={({ field: { value, onChange } }) => (
                <Input label="Company Name" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="businessType"
              render={({ field: { value, onChange } }) => (
                <Input label="Business Type" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="preferences"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Preferences"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Comma separated, e.g. Organic, Grains"
                />
              )}
            />

            <View style={styles.saveRow}>
              <Button
                title="Save Changes"
                onPress={handleSubmit(onSave)}
                loading={isSaving}
                disabled={isSaving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  profileHeaderContent: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarPlaceholderText: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.surface,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  email: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    marginBottom: 4,
  },
  mutedText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
  },
  summaryCardWide: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  latestOrderText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalCancel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalRightSpacer: {
    width: 52,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 24,
  },
  imageEditWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  saveRow: {
    marginTop: 8,
  },
});
