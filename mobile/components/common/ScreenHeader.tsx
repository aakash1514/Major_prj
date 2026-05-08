import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

export default function ScreenHeader({
  title,
  subtitle,
  rightAction,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={rightAction.onPress}>
          <Text style={styles.actionText}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionButton: {
    marginLeft: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
