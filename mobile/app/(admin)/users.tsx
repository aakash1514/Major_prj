import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenHeader from '../../components/common/ScreenHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors } from '@/constants/Colors';
import { api } from '../../utils/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  location?: string;
  kyc: boolean;
  createdAt?: string;
}

const roleVariant = (role: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const value = role.toLowerCase();
  if (value === 'admin') return 'info';
  if (value === 'farmer') return 'success';
  if (value === 'buyer') return 'warning';
  if (value === 'agent') return 'danger';
  return 'default';
};

const normalizeUsers = (raw: any[]): AdminUser[] =>
  raw.map((user) => ({
    id: String(user.id),
    name: String(user.name || 'Unknown'),
    email: String(user.email || ''),
    role: String(user.role || 'user'),
    location: user.location ? String(user.location) : undefined,
    kyc: Boolean(user.kyc),
    createdAt: user.created_at ? String(user.created_at) : undefined,
  }));

export default function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await api.get('/admin/users')) as any[];
      setUsers(normalizeUsers(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchUsers();
    }, [fetchUsers])
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [search, users]);

  const toggleKyc = async () => {
    if (!selectedUser) return;

    try {
      setToggleLoading(true);
      setError(null);

      const response = (await api.put(`/admin/users/${selectedUser.id}/toggle-kyc`, {})) as {
        user?: any;
      };

      const nextKyc =
        response?.user && typeof response.user.kyc === 'boolean'
          ? response.user.kyc
          : !selectedUser.kyc;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                kyc: nextKyc,
              }
            : user
        )
      );

      setSelectedUser((prev) => (prev ? { ...prev, kyc: nextKyc } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle KYC');
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Users" />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Input
          placeholder="Search by name or email"
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInputContainer}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>No users match your search.</Text>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedUser(item)}>
            <Card style={styles.userCard}>
              <CardContent>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>

                <View style={styles.badgeRow}>
                  <Badge
                    label={item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                    variant={roleVariant(item.role)}
                  />
                  <Badge label={item.kyc ? 'KYC Verified' : 'KYC Pending'} variant={item.kyc ? 'success' : 'warning'} />
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedUser(null)} />
          {selectedUser ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>User Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{selectedUser.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{selectedUser.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role</Text>
                <Badge
                  label={selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  variant={roleVariant(selectedUser.role)}
                />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedUser.location || 'Not provided'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>KYC Status</Text>
                <Badge
                  label={selectedUser.kyc ? 'Verified' : 'Pending'}
                  variant={selectedUser.kyc ? 'success' : 'warning'}
                />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN')
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.modalActionRow}>
                <Button
                  title={selectedUser.kyc ? 'Toggle KYC (Set Pending)' : 'Toggle KYC (Set Verified)'}
                  onPress={() => {
                    void toggleKyc();
                  }}
                  variant="primary"
                  size="md"
                  loading={toggleLoading}
                  disabled={toggleLoading}
                  style={styles.fullBtn}
                />
                <Button
                  title="Close"
                  onPress={() => setSelectedUser(null)}
                  variant="outline"
                  size="md"
                  style={styles.fullBtn}
                  disabled={toggleLoading}
                />
              </View>
            </View>
          ) : null}
        </View>
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
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalActionRow: {
    marginTop: 14,
    gap: 10,
  },
  fullBtn: {
    width: '100%',
  },
});
