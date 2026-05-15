import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  KeyboardAvoidingView,
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

interface AgentProfile {
  id: string;
  name: string;
  email: string;
  location?: string;
  contact_number?: string;
  assignmentStats?: {
    totalAssignments: number;
    activeAssignments: number;
    completedDeliveries: number;
    qualityReports: number;
  };
}

interface EditFormData {
  name: string;
  email: string;
  location: string;
  contactNumber: string;
}

export default function AgentProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);

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
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = (await api.get('/agent/profile')) as any;
      const stats = data?.assignmentStats || data?.assignment_stats || {};
      const normalized: AgentProfile = {
        id: String(data.id),
        name: data.name || 'Agent',
        email: data.email || 'N/A',
        location: data.location || '',
        contact_number: data.contact_number || data.contactNumber || '',
        assignmentStats: {
          totalAssignments: Number(stats.totalAssignments ?? stats.total_assignments ?? 0),
          activeAssignments: Number(stats.activeAssignments ?? stats.active_assignments ?? 0),
          completedDeliveries: Number(stats.completedDeliveries ?? stats.completed_deliveries ?? 0),
          qualityReports: Number(stats.qualityReports ?? stats.quality_reports ?? 0),
        },
      };

      setProfile(normalized);

      reset({
        name: normalized.name || '',
        email: normalized.email || '',
        location: normalized.location || '',
        contactNumber: normalized.contact_number || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [fetchProfile])
  );

  const assignmentStats = useMemo(() => {
    return profile?.assignmentStats || {
      totalAssignments: 0,
      activeAssignments: 0,
      completedDeliveries: 0,
      qualityReports: 0,
    };
  }, [profile]);

  const onSave = async (data: EditFormData) => {
    try {
      setSaving(true);
      await api.put('/agent/profile', data);
      Alert.alert('Success', 'Profile updated successfully.');
      setEditVisible(false);
      await fetchProfile();
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
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
        <Card style={styles.headerCard}>
          <CardContent style={styles.headerContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile?.name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{profile?.name || 'Agent'}</Text>
            <Text style={styles.email}>{profile?.email || 'N/A'}</Text>
            <Badge label="Agent" variant="info" style={styles.roleBadge} />
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{profile?.location || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{profile?.contact_number || 'Not provided'}</Text>
            </View>
          </CardContent>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Assignment Stats</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.statsGrid}>
              <StatTile label="Total" value={assignmentStats.totalAssignments} />
              <StatTile label="Active" value={assignmentStats.activeAssignments} />
              <StatTile label="Delivered" value={assignmentStats.completedDeliveries} />
              <StatTile label="Reports" value={assignmentStats.qualityReports} />
            </View>
          </CardContent>
        </Card>

        <Card style={styles.card}>
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
        transparent
        visible={editVisible}
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setEditVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Edit Profile</Text>

              <Controller
                control={control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter name"
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="location"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Location"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter location"
                  />
                )}
              />

              <Controller
                control={control}
                name="contactNumber"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Contact Number"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter contact number"
                    keyboardType="phone-pad"
                  />
                )}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setEditVisible(false)}
                  style={styles.modalButton}
                  disabled={saving}
                />
                <Button
                  title="Save"
                  variant="primary"
                  onPress={handleSubmit(onSave)}
                  style={styles.modalButton}
                  loading={saving}
                  disabled={saving}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: Colors.surface,
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  roleBadge: {
    marginTop: 12,
  },
  card: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalKeyboard: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
  },
});
