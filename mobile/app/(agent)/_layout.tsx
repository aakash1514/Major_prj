import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';

export default function AgentLayout() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Verify user role and redirect if necessary
  useEffect(() => {
    if (user && user.role !== 'agent') {
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
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ color }) => <Ionicons name="car-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspections',
          tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
