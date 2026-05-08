import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors } from '../../constants/Colors';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, user, isAuthenticated } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Navigate to dashboard after successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [isAuthenticated, user, router]);

  const onSubmit = async (data: LoginFormData) => {
    setLocalError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLocalError(message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Green header section */}
        <View style={styles.headerSection}>
          <Text style={styles.logo}>🌾 AgriFlow</Text>
          <Text style={styles.tagline}>Buy, Sell & Predict Farm Prices</Text>
        </View>

        {/* White card with form */}
        <View style={styles.formCard}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Error message */}
          {(error || localError) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error || localError}</Text>
            </View>
          )}

          {/* Email Input */}
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field: { value, onChange } }) => (
              <Input
                label="Email"
                placeholder="your@email.com"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            }}
            render={({ field: { value, onChange } }) => (
              <Input
                label="Password"
                placeholder="••••••"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                secureTextEntry
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          {/* Login Button */}
          <Button
            title="Login"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="md"
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
          />

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              disabled={isLoading}
            >
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  headerSection: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.surface,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: Colors.surface,
    opacity: 0.9,
  },
  formCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: -24,
    marginBottom: 24,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
