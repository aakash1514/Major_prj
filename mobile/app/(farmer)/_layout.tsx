import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';

export default function FarmerLayout() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Verify user role and redirect if necessary
  useEffect(() => {
    if (user && user.role !== 'farmer') {
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
        name="my-crops"
        options={{
          title: 'My Crops',
          tabBarIcon: ({ color }) => <Ionicons name="leaf-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-crop"
        options={{
          title: 'Add Crop',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />,
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
        name="crops/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="orders/[id]"
        options={{
          href: null,
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
