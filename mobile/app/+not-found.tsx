import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>The page you are looking for does not exist.</Text>

        <TouchableOpacity style={styles.button} onPress={handleGoBack}>
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
