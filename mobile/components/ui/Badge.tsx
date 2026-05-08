import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  style?: ViewStyle;
}

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
  const variantStyles = variantMap[variant];

  return (
    <View style={[styles.badge, variantStyles.container, style]}>
      <Text style={[styles.text, variantStyles.text]}>{label}</Text>
    </View>
  );
}

const variantMap = {
  success: {
    container: { backgroundColor: Colors.success },
    text: { color: '#fff' },
  },
  warning: {
    container: { backgroundColor: Colors.warning },
    text: { color: '#fff' },
  },
  danger: {
    container: { backgroundColor: Colors.danger },
    text: { color: '#fff' },
  },
  info: {
    container: { backgroundColor: Colors.info },
    text: { color: '#fff' },
  },
  default: {
    container: { backgroundColor: Colors.border },
    text: { color: Colors.textPrimary },
  },
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
