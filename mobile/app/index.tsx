import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    // Redirect based on auth state
    if (!isLoading) {
      if (isAuthenticated && user) {
        router.replace(`/(${user.role})/dashboard` as any);
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading spinner while checking auth state
  return <LoadingSpinner message="Checking authentication..." />;
}
