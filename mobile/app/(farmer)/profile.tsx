import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/Colors';

interface FarmerProfile {
  name?: string;
  email?: string;
  location?: string;
  contactNumber?: string;
  profileImage?: string;
  farm_size?: string;
  farm_location?: string;
  crop_types?: string[];
}

interface EditFormData {
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  farm_size: string;
  farm_location: string;
}

const ProfileAvatar: React.FC<{ image?: string; name?: string }> = ({ image, name }) => {
  const initials = (name || 'F').substring(0, 2).toUpperCase();

  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={styles.profileImage}
      />
    );
  }

  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
};

export default function FarmerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    defaultValues: {
      name: '',
      email: '',
      location: '',
      contactNumber: '',
      farm_size: '',
      farm_location: '',
    },
  });

  // Fetch profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/farmer/profile') as FarmerProfile;
      setProfile(data);
      setProfileImage(data.profileImage);

      // Reset form with fetched data
      reset({
        name: data.name || '',
        email: data.email || '',
        location: data.location || '',
        contactNumber: data.contactNumber || '',
        farm_size: data.farm_size || '',
        farm_location: data.farm_location || '',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const base64 = result.assets[0].base64;
        if (base64) {
          setProfileImage(`data:image/jpeg;base64,${base64}`);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const onSubmit = async (data: EditFormData) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...data,
        profileImage,
      };

      await api.put('/farmer/profile', payload);

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setEditModalVisible(false);
            void fetchProfile();
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
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
          onPress: () => setEditModalVisible(true),
        }}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <Card style={styles.headerCard}>
          <CardContent style={styles.headerCardContent}>
            <ProfileAvatar image={profileImage} name={profile?.name} />
            <View style={styles.profileHeaderText}>
              <Text style={styles.profileName}>{profile?.name || 'Farmer'}</Text>
              <Text style={styles.profileEmail}>{profile?.email || 'email@example.com'}</Text>
            </View>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{profile?.name || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile?.email || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoValue}>
                  {profile?.contactNumber || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{profile?.location || 'Not provided'}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Farm Information */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>Farm Information</Text>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Ionicons name="resize" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Farm Size</Text>
                <Text style={styles.infoValue}>{profile?.farm_size || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="map" size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Farm Location</Text>
                <Text style={styles.infoValue}>
                  {profile?.farm_location || 'Not provided'}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Crop Types */}
        {profile?.crop_types && profile.crop_types.length > 0 && (
          <Card style={styles.card}>
            <CardHeader>
              <Text style={styles.cardTitle}>Crop Types</Text>
            </CardHeader>
            <CardContent style={styles.cardContent}>
              <View style={styles.badgeContainer}>
                {profile.crop_types.map((cropType, index) => (
                  <Badge
                    key={index}
                    label={cropType}
                    variant="info"
                    style={styles.cropBadge}
                  />
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        <Card style={styles.card}>
          <CardContent style={styles.cardContent}>
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="danger"
              size="md"
            />
          </CardContent>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Image Editor */}
            <View style={styles.imageEditorSection}>
              <ProfileAvatar image={profileImage} name={profile?.name} />
              <Button
                title="Change Photo"
                onPress={pickProfileImage}
                variant="outline"
                size="sm"
                style={styles.changePhotoButton}
              />
            </View>

            {/* Form Fields */}
            <Controller
              control={control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Name"
                  placeholder="Your full name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            <Controller
              control={control}
              name="contactNumber"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Contact Number"
                  placeholder="+91 1234567890"
                  value={value}
                  onChangeText={onChange}
                  error={errors.contactNumber?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Location"
                  placeholder="City, State"
                  value={value}
                  onChangeText={onChange}
                  error={errors.location?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            <Controller
              control={control}
              name="farm_size"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Farm Size"
                  placeholder="e.g., 5 acres"
                  value={value}
                  onChangeText={onChange}
                  error={errors.farm_size?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            <Controller
              control={control}
              name="farm_location"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Farm Location"
                  placeholder="Detailed farm location"
                  value={value}
                  onChangeText={onChange}
                  error={errors.farm_location?.message}
                  editable={!isSubmitting}
                  containerStyle={styles.inputContainer}
                />
              )}
            />

            {/* Buttons */}
            <View style={styles.modalButtonContainer}>
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="outline"
                size="md"
                disabled={isSubmitting}
                style={styles.modalButton}
              />
              <Button
                title="Save Changes"
                onPress={handleSubmit(onSubmit)}
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.modalButton}
              />
            </View>

            <View style={styles.bottomPadding} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
  },
  headerCard: {
    marginBottom: 20,
    borderRadius: 12,
  },
  headerCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.surface,
  },
  profileHeaderText: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropBadge: {
    marginBottom: 4,
  },
  bottomPadding: {
    height: 20,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  imageEditorSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  changePhotoButton: {
    marginTop: 12,
  },
  inputContainer: {
    marginBottom: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
});
