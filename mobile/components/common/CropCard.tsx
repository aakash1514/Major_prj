import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native';
import { Card, CardContent, CardFooter } from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';
import { Crop } from '../../types';
import { Colors } from '../../constants/Colors';

interface CropCardProps {
  crop: Crop;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function CropCard({ crop, onPress, style }: CropCardProps) {
  const hasImage = crop.images && crop.images.length > 0;
  const imageUri = hasImage ? crop.images[0] : null;
  const cropInitial = crop.name.charAt(0).toUpperCase();

  const cardContent = (
    <Card style={style}>
      {/* Image or Placeholder */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{cropInitial}</Text>
        </View>
      )}

      <CardContent>
        {/* Crop Name and Price Header */}
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {crop.name}
          </Text>
          {crop.price ? (
            <Text style={styles.price}>₹{crop.price}</Text>
          ) : null}
        </View>

        {/* Quantity */}
        <Text style={styles.quantity}>
          {crop.quantity} {crop.unit}
        </Text>

        {/* Description if available */}
        {crop.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {crop.description}
          </Text>
        ) : null}
      </CardContent>

      {/* Footer with Status */}
      <CardFooter>
        <StatusBadge status={crop.status} />
      </CardFooter>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.border,
  },
  placeholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  quantity: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

