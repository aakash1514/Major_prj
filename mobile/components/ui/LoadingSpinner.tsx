import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export default function LoadingSpinner({
  size = 'large',
  color = Colors.primary,
  message,
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
