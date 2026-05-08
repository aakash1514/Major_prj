import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';

export default function AdminLayout() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Verify user role and redirect if necessary
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace(`/(${user.role})/dashboard` as any);
    }
  }, [user?.role, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="crop-submissions"
        options={{
          title: 'Submissions',
          tabBarIcon: ({ color }) => <Ionicons name="leaf-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
