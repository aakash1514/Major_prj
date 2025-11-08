import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { UserRole } from '../../types';

interface LoginFormData {
  email: string;
  password: string;
  role: UserRole;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, error: storeError, isLoading: storeLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      role: 'farmer',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    
    try {
      // Call the login function with just username and password
      // Your backend should determine the role from the user data
      await login(data.email, data.password);
      
      // The store will update isAuthenticated and user
      // Check if authentication was successful
      const user = useAuthStore.getState().user;
      
      if (user) {
        // Redirect based on the user's actual role from the response
        const redirectPath = `/${user.role}/dashboard`;
        navigate(redirectPath);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(storeError || 'An error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">AgriFresh</h1>
          <p className="mt-2 text-gray-600">Sign in to access your account</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            {(error || storeError) && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error || storeError}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="Sign in as"
                options={[
                  { value: 'farmer', label: 'Farmer' },
                  { value: 'buyer', label: 'Buyer' },
                  { value: 'admin', label: 'Administrator' },
                  { value: 'agent', label: 'Quality Agent' },
                ]}
                fullWidth
                {...register('role', { required: 'Please select a role' })}
                error={errors.role?.message}
              />
              
              <Input
                label="Email Address"
                type="email"
                placeholder="email@example.com"
                fullWidth
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  } 
                })}
                error={errors.email?.message}
              />
              
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                fullWidth
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  }
                })}
                error={errors.password?.message}
              />
              
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={storeLoading}
              >
                {storeLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-center text-sm text-gray-600">
              Demo accounts: [role]@example.com with password "password"
            </p>
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="font-medium text-green-700 hover:text-green-800">
                Register
              </a>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};