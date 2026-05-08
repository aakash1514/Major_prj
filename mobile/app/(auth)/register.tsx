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
import { UserRole } from '../../types';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  location?: string;
  contactNumber?: string;
}

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Farmer', value: 'farmer' },
  { label: 'Buyer', value: 'buyer' },
  { label: 'Agent', value: 'agent' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error: storeError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'farmer',
      location: '',
      contactNumber: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setLocalError(null);
    setSuccessMessage(null);

    try {
      const registerData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        ...(data.location && { location: data.location }),
        ...(data.contactNumber && { contactNumber: data.contactNumber }),
      };

      await register(registerData);
      setSuccessMessage('Registration successful! Redirecting to login...');

      // Navigate to login after 1 second
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
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
          <Text style={styles.tagline}>Join Our Farming Community</Text>
        </View>

        {/* White card with form */}
        <View style={styles.formCard}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {/* Success message */}
          {successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Error message */}
          {(storeError || localError) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{storeError || localError}</Text>
            </View>
          )}

          {/* Name Input */}
          <Controller
            control={control}
            name="name"
            rules={{
              required: 'Full name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            }}
            render={({ field: { value, onChange } }) => (
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />
            )}
          />

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

          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Role *</Text>
            <Controller
              control={control}
              name="role"
              rules={{ required: 'Role is required' }}
              render={({ field: { value, onChange } }) => (
                <View style={styles.roleButtonsContainer}>
                  {ROLE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.roleButton,
                        value === option.value
                          ? styles.roleButtonActive
                          : styles.roleButtonInactive,
                      ]}
                      onPress={() => onChange(option.value)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          value === option.value
                            ? styles.roleButtonTextActive
                            : styles.roleButtonTextInactive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.role && (
              <Text style={styles.errorMessage}>{errors.role.message}</Text>
            )}
          </View>

          {/* Location Input (Optional) */}
          <Controller
            control={control}
            name="location"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Location (Optional)"
                placeholder="City, State"
                value={value}
                onChangeText={onChange}
                error={errors.location?.message}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          {/* Contact Number Input (Optional) */}
          <Controller
            control={control}
            name="contactNumber"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Contact Number (Optional)"
                placeholder="+91 1234567890"
                value={value}
                onChangeText={onChange}
                error={errors.contactNumber?.message}
                editable={!isLoading}
                containerStyle={styles.inputContainer}
              />
            )}
          />

          {/* Register Button */}
          <Button
            title="Register"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="md"
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
          />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>Login</Text>
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
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
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
    paddingTop: 24,
    paddingBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  roleSection: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: Colors.surface,
  },
  roleButtonTextInactive: {
    color: Colors.textSecondary,
  },
  errorMessage: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
  registerButton: {
    marginTop: 12,
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
