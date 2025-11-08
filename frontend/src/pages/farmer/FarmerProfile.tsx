import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { 
  User, MapPin, Phone, Mail, Calendar, Edit, 
  Save, X, Camera, Shield, Award, Leaf
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api'; // Import api for additional profile details

// Interface representing farmer profile fields
interface ProfileFormData {
  name: string; // From users table
  email: string; // From users table
  phone: string; // From farmers table
  location: string; // From farmers table
  bio: string; // From farmers table
  farm_size: string; // From farmers table
  experience: string; // From farmers table
  crop_preference: string; // From farmers table
  profile_pic?: File; // For file upload
}

// Interface for the farmer profile data received from API
interface FarmerProfile {
  phone: string;
  location: string;
  bio: string;
  farm_size: string;
  experience: string;
  crop_preference: string;
  profile_pic?: string;
}

export const FarmerProfile: React.FC = () => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);

  // Form setup
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
      farm_size: '',
      experience: '',
      crop_preference: '',
    },
  });

  // Get farmer profile details on component mount
useEffect(() => {
  console.log("🧠 useAuthStore - user:", user);
  if (user?.id) {
    fetchFarmerProfile(String(user.id));
  } else {
    console.warn("🟡 Skipping fetch: user not ready yet");
  }
}, [user?.id]);

useEffect(() => {
  setTimeout(() => {
    console.log("⏱️ Forcing profile fetch...");
    if (user?.id) fetchFarmerProfile(user.id);
  }, 1000);
}, []);

// Watch for farmerProfile changes and log them
useEffect(() => {
  console.log('👀 farmerProfile state changed:', farmerProfile);
}, [farmerProfile]);



  const fetchFarmerProfile = async (farmerId: string) => {
    try {
      const response = await api.get('/farmer/profile');
      
      console.log('📦 Received farmer profile:', response); 
      if (response) {
        // Store the farmer profile data
        setFarmerProfile(response);
        console.log('✅ setFarmerProfile called with:', response);
        
        // Update the form with combined user + farmer data
        reset({
          name: response.name || user?.name || '', 
          email: response.email || user?.email || '', 
          phone: response.phone || '',
          location: response.location || '',
          bio: response.bio || '',
          farm_size: response.farm_size || '',
          experience: response.experience || '',
          crop_preference: response.crop_preference || '',
        });
        
        // Set profile image if available
        if (response.profile_image) {
          setProfileImage(response.profile_image);
        }
      }
    } catch (error) {
      console.error('Error fetching farmer profile:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
  setIsLoading(true);

  try {
    const token = localStorage.getItem('token');

    // Send as JSON, not FormData
    const payload = {
      phone: data.phone || '',
      location: data.location || '',
      bio: data.bio || '',
      farm_size: data.farm_size || '',
      experience: data.experience || '',
      crop_preference: data.crop_preference || ''
    };

    console.log('📤 Sending payload:', payload);

    const response = await fetch('http://localhost:5000/api/farmer/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Updated profile response:', result);
    
    // Create the profile object with all fields
    const updatedProfile = {
      name: result.name || user?.name || '',
      email: result.email || user?.email || '',
      phone: result.phone || '',
      location: result.location || '',
      bio: result.bio || '',
      farm_size: result.farm_size || '',
      experience: result.experience || '',
      crop_preference: result.crop_preference || '',
      profile_image: result.profile_image || '',
      id: result.id,
      role: result.role,
      kyc: result.kyc,
      contact_number: result.contact_number,
      farmerDetails: result.farmerDetails || {}
    };
    
    console.log('✅ Setting farmerProfile to:', updatedProfile);
    
    // Update local state with the new profile data
    setFarmerProfile(updatedProfile);
    
    // Update form with new values
    reset(updatedProfile);

    if (result.profile_image) {
      setProfileImage(result.profile_image);
    }

    alert('✅ Profile updated successfully!');
    setIsEditing(false);
    setIsLoading(false);
    
    // Re-fetch profile to ensure we have the latest data
    setTimeout(() => {
      if (user?.id) {
        fetchFarmerProfile(String(user.id));
      }
    }, 500);
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('❌ Failed to update profile: ' + (error instanceof Error ? error.message : 'Unknown error'));
    setIsLoading(false);
  }
};

  const handleCancel = () => {
    // Reset form to current values
    if (farmerProfile) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        phone: farmerProfile.phone || '',
        location: farmerProfile.location || '',
        bio: farmerProfile.bio || '',
        farm_size: farmerProfile.farm_size || '',
        experience: farmerProfile.experience || '',
        crop_preference: farmerProfile.crop_preference || '',
      });
    }
    setImageFile(null);
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Store the file for form submission
      setImageFile(file);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileImage(previewUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your farmer profile and account settings</p>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            icon={<Edit size={16} />}
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Profile Picture Upload */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-green-700" />
                        )}
                      </div>
                      <label 
                        htmlFor="profile-image-upload" 
                        className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-md border hover:bg-gray-50 cursor-pointer"
                      >
                        <Camera className="h-4 w-4 text-gray-600" />
                      </label>
                      <input 
                        type="file"
                        id="profile-image-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Profile Picture</p>
                      <p className="text-xs text-gray-500">Upload a new profile picture</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      {...register('name')}
                      disabled={true} // Disabled since it's from the users table
                      fullWidth
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      {...register('email')}
                      disabled={true} // Disabled since it's from the users table
                      fullWidth
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      {...register('phone')}
                      fullWidth
                    />
                    <Input
                      label="Location"
                      {...register('location')}
                      fullWidth
                    />
                  </div>

                  <Textarea
                    label="Bio"
                    rows={3}
                    {...register('bio')}
                    fullWidth
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Farm Size"
                      {...register('farm_size')}
                      fullWidth
                    />
                    <Input
                      label="Experience"
                      {...register('experience')}
                      fullWidth
                    />
                    <Input
                      label="Crop Preference"
                      {...register('crop_preference')}
                      fullWidth
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      icon={<X size={16} />}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Save size={16} />}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-start space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-green-700" />
                        )}
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-md border hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>

                      <p className="text-gray-600">{user?.email}</p>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {farmerProfile?.location || 'Location not set'}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {farmerProfile?.phone || 'Phone not set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant="success">Verified Farmer</Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined {new Date(new Date()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Bio and Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">About</h3>
                      <p className="text-gray-600 text-sm">
                        {farmerProfile?.bio || 'No bio provided'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Farm Size:</span>
                        <span className="ml-2 text-sm font-medium">{farmerProfile?.farm_size || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Experience:</span>
                        <span className="ml-2 text-sm font-medium">{farmerProfile?.experience || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Crop Preference:</span>
                        <span className="ml-2 text-sm font-medium">{farmerProfile?.crop_preference || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements & Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <Award className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">Organic Certified</h4>
                    <p className="text-sm text-green-700">USDA Organic Certification</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Shield className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Quality Assured</h4>
                    <p className="text-sm text-blue-700">100% Quality Rating</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                  <div className="p-2 bg-amber-100 rounded-lg mr-3">
                    <Leaf className="h-6 w-6 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-900">Sustainable Farming</h4>
                    <p className="text-sm text-amber-700">Eco-friendly practices</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <User className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-900">Top Seller</h4>
                    <p className="text-sm text-purple-700">High customer satisfaction</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" fullWidth icon={<Leaf size={16} />}>
                Add New Crop
              </Button>
              <Button variant="outline" fullWidth icon={<User size={16} />}>
                Update KYC
              </Button>
              <Button variant="outline" fullWidth icon={<Shield size={16} />}>
                Security Settings
              </Button>
              <Button variant="outline" fullWidth icon={<Mail size={16} />}>
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-gray-800">Profile updated successfully</p>
                    <p className="text-gray-500 text-xs">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-gray-800">New crop listing approved</p>
                    <p className="text-gray-500 text-xs">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-gray-800">Order payment received</p>
                    <p className="text-gray-500 text-xs">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};