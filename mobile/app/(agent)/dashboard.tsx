import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/ui/Button';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Colors } from '../../constants/Colors';

export default function AgentDashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dashboard" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>Agent Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage deliveries, inspections, and shared predictions from here.
          </Text>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <View style={styles.actionButtonWrap}>
              <Button
                title="Deliveries"
                onPress={() => router.push('/agent/deliveries')}
                variant="primary"
                size="md"
              />
            </View>
            <View style={styles.actionButtonWrap}>
              <Button
                title="Inspections"
                onPress={() => router.push('/agent/inspections')}
                variant="secondary"
                size="md"
              />
            </View>
            <View style={styles.actionButtonWrap}>
              <Button
                title="Predictions"
                onPress={() => router.push('/(shared)/predictions')}
                variant="outline"
                size="md"
              />
            </View>
          </View>
        </View>
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
    gap: 16,
  },
  hero: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.surface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.surface,
    opacity: 0.9,
  },
  quickActionsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonWrap: {
    flex: 1,
  },
});
