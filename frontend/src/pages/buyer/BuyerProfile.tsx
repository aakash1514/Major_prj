import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  User, MapPin, Phone, Mail, Edit, 
  Save, X, Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';

interface ProfileFormData {
  name: string;
  email: string;
  contactNumber: string;
  location: string;
  preferences: string;
}

interface BuyerProfileData {
  name: string;
  email: string;
  contact_number?: string;
  location?: string;
  preferences?: string;
  profile_image?: string;
}

export const BuyerProfile: React.FC = () => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfileData | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      contactNumber: '',
      location: '',
      preferences: '',
    },
  });

  // Fetch buyer profile on mount
  useEffect(() => {
    if (user?.id) {
      fetchBuyerProfile();
    }
  }, [user?.id]);

  const fetchBuyerProfile = async () => {
    try {
      const response = await api.get('/buyers/profile');
      console.log('📦 Received buyer profile:', response);
      
      if (response) {
        setBuyerProfile(response);
        reset({
          name: response.name || user?.name || '',
          email: response.email || user?.email || '',
          contactNumber: response.contact_number || '',
          location: response.location || '',
          preferences: response.preferences || '',
        });
        if (response.profile_image) {
          setProfileImage(response.profile_image);
        }
      }
    } catch (error) {
      console.error('Error fetching buyer profile:', error);
      // Set defaults from auth store if fetch fails
      reset({
        name: user?.name || '',
        email: user?.email || '',
        contactNumber: '',
        location: '',
        preferences: '',
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const payload = {
        name: data.name,
        email: data.email,
        contactNumber: data.contactNumber || null,
        location: data.location || null,
        preferences: data.preferences || null,
      };

      console.log('📤 Sending buyer profile update:', payload);

      const response = await api.put('/buyers/profile', payload);

      console.log('✅ Profile updated:', response);
      setBuyerProfile(response.user);
      setIsEditing(false);
      alert('✅ Profile updated successfully!');

      // Re-fetch to ensure we have latest data
      setTimeout(() => {
        fetchBuyerProfile();
      }, 500);
    } catch (error) {
      console.error('❌ Update error:', error);
      alert('❌ Failed to update profile: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const displayName = buyerProfile?.name || user?.name || 'Buyer';
  const displayEmail = buyerProfile?.email || user?.email || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your buyer account information</p>
        </div>
        <Button
          variant={isEditing ? 'secondary' : 'primary'}
          icon={isEditing ? <X size={16} /> : <Edit size={16} />}
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              reset();
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Profile Picture */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} className="text-white" />
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer">
                        <Camera size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                  <div className="flex items-center justify-center text-gray-600">
                    <Mail size={16} className="mr-2" />
                    <span className="text-sm">{displayEmail}</span>
                  </div>
                  <Badge variant="success" className="inline-block">
                    Verified Buyer
                  </Badge>
                </div>

                {/* Additional Info */}
                {!isEditing && (
                  <div className="space-y-3 pt-4 border-t">
                    {buyerProfile?.contact_number && (
                      <div className="flex items-center text-gray-700">
                        <Phone size={16} className="mr-2 text-gray-400" />
                        <span className="text-sm">{buyerProfile.contact_number}</span>
                      </div>
                    )}
                    {buyerProfile?.location && (
                      <div className="flex items-start text-gray-700">
                        <MapPin size={16} className="mr-2 text-gray-400 mt-0.5" />
                        <span className="text-sm">{buyerProfile.location}</span>
                      </div>
                    )}
                    {buyerProfile?.preferences && (
                      <div className="text-sm text-gray-600 mt-4">
                        <p className="font-semibold text-gray-700 mb-2">Food Preferences</p>
                        <p>{buyerProfile.preferences}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Form */}
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...register('email', { required: 'Email is required' })}
                      disabled
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...register('contactNumber')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <Input
                      type="text"
                      placeholder="City, State/Province"
                      {...register('location')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Food Preferences
                    </label>
                    <Textarea
                      placeholder="Tell us about your food preferences and dietary requirements..."
                      {...register('preferences')}
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Save size={16} />}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        reset();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* View Mode */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <p className="text-gray-900 font-semibold">{displayName}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <p className="text-gray-900 font-semibold">{displayEmail}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {buyerProfile?.contact_number || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {buyerProfile?.location || 'Not provided'}
                    </p>
                  </div>
                </div>

                {buyerProfile?.preferences && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Preferences
                    </label>
                    <p className="text-gray-900">{buyerProfile.preferences}</p>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Account Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Badge variant="success" className="inline-block">
                        Verified Account
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Account status: Active and verified
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};
