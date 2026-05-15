import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PredictionPanel from '../../components/common/PredictionPanel';
import { Colors } from '../../constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

interface AddCropFormData {
  name: string;
  quantity: string;
  unit: string;
  harvest_date: string;
  description: string;
  price: string;
  category: string;
}

interface SelectedImage {
  uri: string;
  base64: string;
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'tonne', label: 'Tonne' },
];

const encodeTextToNumber = (value: string) => {
  return value
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
};

const getWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const parseNumberInput = (value: string) => {
  const normalized = value.replace(/[^0-9.]/g, '');
  return Number.parseFloat(normalized);
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddCropScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddCropFormData>({
    defaultValues: {
      name: '',
      quantity: '',
      unit: 'kg',
      harvest_date: '',
      description: '',
      price: '',
      category: '',
    },
  });

  const watchedCropName = watch('name');
  const watchedQuantity = watch('quantity');
  const watchedHarvestDate = watch('harvest_date');

  const pricePredictionInput = useMemo(() => {
    const cropName = (watchedCropName || '').trim();
    const quantity = Number(watchedQuantity);
    const harvestDate = watchedHarvestDate ? new Date(watchedHarvestDate) : null;

    if (
      !cropName ||
      !harvestDate ||
      Number.isNaN(harvestDate.getTime()) ||
      quantity <= 0
    ) {
      return null;
    }

    const locationSeed = (user?.location || user?.name || 'default').toLowerCase();
    const cropSeed = encodeTextToNumber(cropName.toLowerCase());
    const locationCode = encodeTextToNumber(locationSeed);

    return {
      cropName,
      quantity,
      unit: 'kg',
      harvestDate,
      location: user?.location || 'Default',
    };
  }, [watchedCropName, watchedHarvestDate, watchedQuantity, user?.location, user?.name]);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, 3 - selectedImages.length);
        const converted = await Promise.all(
          newImages.map(async (asset) => {
            if (asset.base64) {
              return {
                uri: asset.uri,
                base64: asset.base64,
              };
            } else {
              // If base64 not provided, read file
              const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return {
                uri: asset.uri,
                base64,
              };
            }
          })
        );

        setSelectedImages([...selectedImages, ...converted]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: AddCropFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: data.name,
        quantity: Number(data.quantity),
        unit: data.unit,
        harvest_date: data.harvest_date,
        price: Number.isFinite(parseNumberInput(data.price))
          ? parseNumberInput(data.price)
          : 0,
        description: data.description,
        tac: data.category,
        images: selectedImages.map((img) => `data:image/jpeg;base64,${img.base64}`),
      };

      const response = await api.post('/crops', payload);
      console.log('✅ Crop added:', response);

      Alert.alert(
        'Success',
        'Crop submitted successfully and is pending approval!',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(farmer)/my-crops');
            },
          },
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit crop';
      setSubmitError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(farmer)/my-crops');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add Crop"
        rightAction={{
          label: 'Cancel',
          onPress: handleCancel,
        }}
      />

      {isSubmitting && <LoadingSpinner message="Submitting crop..." />}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          {/* Crop Details Card */}
          <Card style={styles.card}>
            <CardHeader>
              <Text style={styles.cardTitle}>Crop Details</Text>
            </CardHeader>
            <CardContent style={styles.cardContent}>
              {/* Crop Name */}
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Crop name is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Crop Name"
                    placeholder="e.g., Organic Wheat"
                    value={value}
                    onChangeText={onChange}
                    error={errors.name?.message}
                    editable={!isSubmitting}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />

              {/* Quantity and Unit Row */}
              <View style={styles.row}>
                <View style={styles.halfColumn}>
                  <Controller
                    control={control}
                    name="quantity"
                    rules={{
                      required: 'Quantity is required',
                      pattern: {
                        value: /^\d+(\.\d+)?$/,
                        message: 'Quantity must be a valid number',
                      },
                    }}
                    render={({ field: { value, onChange } }) => (
                      <Input
                        label="Quantity"
                        placeholder="e.g., 500"
                        value={value}
                        onChangeText={onChange}
                        error={errors.quantity?.message}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                      />
                    )}
                  />
                </View>

                <View style={styles.halfColumn}>
                  <Controller
                    control={control}
                    name="unit"
                    rules={{ required: 'Unit is required' }}
                    render={({ field: { value, onChange } }) => (
                      <View>
                        <Text style={styles.inputLabel}>Unit *</Text>
                        <Select
                          options={UNIT_OPTIONS}
                          value={value}
                          onValueChange={onChange}
                          style={styles.select}
                        />
                      </View>
                    )}
                  />
                </View>
              </View>

              {/* Harvest Date */}
              <Controller
                control={control}
                name="harvest_date"
                rules={{ required: 'Harvest date is required' }}
                render={({ field: { value, onChange } }) => (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowDatePicker(true)}
                      disabled={isSubmitting}
                    >
                      <View pointerEvents="none">
                        <Input
                          label="Harvest Date"
                          placeholder="YYYY-MM-DD"
                          value={value}
                          error={errors.harvest_date?.message}
                          editable={false}
                          containerStyle={styles.inputContainer}
                        />
                      </View>
                    </TouchableOpacity>
                    {showDatePicker ? (
                      <DateTimePicker
                        value={value ? new Date(value) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          if (event.type !== 'dismissed' && selectedDate) {
                            onChange(formatDate(selectedDate));
                          }
                          if (Platform.OS !== 'ios') {
                            setShowDatePicker(false);
                          }
                        }}
                      />
                    ) : null}
                  </>
                )}
              />

              {/* Price */}
              <Controller
                control={control}
                name="price"
                rules={{
                  required: 'Price is required',
                  pattern: {
                    value: /^\d+(\.\d+)?$/,
                    message: 'Price must be a valid number',
                  },
                }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Expected Price (per unit)"
                    placeholder="e.g., 250"
                    value={value}
                    onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                    error={errors.price?.message}
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />

              {/* Price Prediction Panel */}
              {pricePredictionInput && (
                <View style={styles.predictionContainer}>
                  <Text style={styles.predictionLabel}>AI Suggested Price</Text>
                  <PredictionPanel
                    mode="price"
                    inputData={pricePredictionInput}
                    cropName={watchedCropName || 'Crop'}
                  />
                </View>
              )}

              {/* Description */}
              <Controller
                control={control}
                name="description"
                rules={{ required: 'Description is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Description"
                    placeholder="Describe your crop, growing methods, and characteristics..."
                    value={value}
                    onChangeText={onChange}
                    error={errors.description?.message}
                    multiline
                    numberOfLines={4}
                    editable={!isSubmitting}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />

              {/* Category (Terms & Conditions) */}
              <Controller
                control={control}
                name="category"
                rules={{ required: 'Terms and conditions are required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Terms & Conditions"
                    placeholder="Any specific terms or conditions for the sale..."
                    value={value}
                    onChangeText={onChange}
                    error={errors.category?.message}
                    multiline
                    numberOfLines={3}
                    editable={!isSubmitting}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Images Card */}
          <Card style={styles.card}>
            <CardHeader>
              <Text style={styles.cardTitle}>Crop Images</Text>
            </CardHeader>
            <CardContent style={styles.cardContent}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImages}
                disabled={isSubmitting || selectedImages.length >= 3}
              >
                <Ionicons name="cloud-upload-outline" size={32} color={Colors.primary} />
                <Text style={styles.uploadText}>
                  {selectedImages.length >= 3
                    ? 'Maximum 3 images selected'
                    : `Select images (${selectedImages.length}/3)`}
                </Text>
                <Text style={styles.uploadSubtext}>Tap to select photos from gallery</Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <View style={styles.imageGrid}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.image}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.danger} />
                      </TouchableOpacity>
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>1.</Text>
                <Text style={styles.infoText}>Your crop submission will be reviewed by an administrator</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>2.</Text>
                <Text style={styles.infoText}>A quality agent will be assigned to inspect your crop</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>3.</Text>
                <Text style={styles.infoText}>After inspection, your crop will be approved or rejected</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>4.</Text>
                <Text style={styles.infoText}>Approved crops will be listed on the marketplace</Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit Crop'}
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  halfColumn: {
    flex: 1,
  },
  select: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  predictionContainer: {
    marginTop: 16,
    marginBottom: 14,
  },
  predictionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  uploadSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '30%',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: Colors.info,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.info,
    marginBottom: 10,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBullet: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.info,
    minWidth: 18,
  },
  infoText: {
    fontSize: 12,
    color: Colors.info,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
