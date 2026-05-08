import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [isRehydrated, setIsRehydrated] = useState(false);
  const { rehydrate } = useAuthStore();

  // Rehydrate auth state from SecureStore on mount
  useEffect(() => {
    const rehydrateAuth = async () => {
      try {
        await rehydrate();
      } catch (err) {
        console.error('Error rehydrating auth:', err);
      } finally {
        setIsRehydrated(true);
      }
    };

    void rehydrateAuth();
  }, [rehydrate]);

  // Handle font errors
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide splash screen when both fonts and auth are ready
  useEffect(() => {
    if (loaded && isRehydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isRehydrated]);

  // Show loading spinner while assets and auth are loading
  if (!loaded || !isRehydrated) {
    return <LoadingSpinner message="Loading AgriFlow..." />;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(farmer)" />
      <Stack.Screen name="(buyer)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(agent)" />
      <Stack.Screen name="(shared)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
