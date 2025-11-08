import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Eye, User, Shield, MapPin, 
  Calendar, Phone, CheckCircle, X, Edit
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'buyer' | 'admin' | 'agent';
  location?: string;
  contact_number?: string;
  profile_image?: string;
  kyc: boolean;
  created_at: string;
  status?: string;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Fetch users on mount
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('📥 Fetched users from backend:', data);
      
      // Backend returns array directly
      const usersArray = Array.isArray(data) ? data : (data.users || []);
      setUsers(usersArray);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

    // Apply filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.status === statusFilter);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'role':
        return a.role.localeCompare(b.role);
      case 'status':
        return (a.status || 'active').localeCompare(b.status || 'active');
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getUserStats = () => {
    return {
      total: users.length,
      farmers: users.filter(u => u.role === 'farmer').length,
      buyers: users.filter(u => u.role === 'buyer').length,
      agents: users.filter(u => u.role === 'agent').length,
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
    };
  };

  const stats = getUserStats();

  const handleViewUser = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleUpdateUserStatus = (userId: string, newStatus: string) => {
    // In a real app, this would call an API
    console.log('Updating user status:', userId, newStatus);
  };

  const selectedUserData = selectedUser ? users.find(u => u.id === selectedUser) : null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'farmer': return 'bg-green-100 text-green-800';
      case 'buyer': return 'bg-blue-100 text-blue-800';
      case 'agent': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'suspended': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage all platform users and their permissions</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.farmers}</div>
              <div className="text-sm text-gray-500">Farmers</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.buyers}</div>
              <div className="text-sm text-gray-500">Buyers</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{stats.agents}</div>
              <div className="text-sm text-gray-500">Agents</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                fullWidth
              />
            </div>

            <Select
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'farmer', label: 'Farmers' },
                { value: 'buyer', label: 'Buyers' },
                { value: 'agent', label: 'Agents' },
                { value: 'admin', label: 'Admins' },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-48"
            />

            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48"
            />

            <Select
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'name', label: 'Name A-Z' },
                { value: 'role', label: 'Role' },
                { value: 'status', label: 'Status' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {sortedUsers.length > 0 ? (
        <div className="space-y-4">
          {sortedUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            {user.name}
                            {user.kyc && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                            )}
                          </h3>
                          <p className="text-gray-600">{user.email}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                          <Badge variant={getStatusColor(user.status || 'active') as any}>
                            {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Location</p>
                            <p className="font-medium">{user.location || 'Not specified'}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Contact</p>
                            <p className="font-medium">{user.contact_number || 'Not provided'}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">Joined</p>
                            <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Shield className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-500">KYC Status</p>
                            <p className={`font-medium ${user.kyc ? 'text-green-600' : 'text-amber-600'}`}>
                              {user.kyc ? 'Verified' : 'Pending'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Role-specific stats - remove these for now since API doesn't return them */}
                      {/* We would need separate endpoints to fetch these stats */}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:w-32">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => handleViewUser(user.id)}
                        fullWidth
                      >
                        View Details
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Edit size={14} />}
                        fullWidth
                      >
                        Manage User
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : "No users available at the moment."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Details Modal */}
      {selectedUser && selectedUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                  <p className="text-gray-600">{selectedUserData.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X size={16} />}
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Full Name</label>
                      <p className="font-medium">{selectedUserData.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{selectedUserData.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Role</label>
                      <Badge className={getRoleColor(selectedUserData.role)}>
                        {selectedUserData.role.charAt(0).toUpperCase() + selectedUserData.role.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Status</label>
                      <Badge variant={getStatusColor(selectedUserData.status || 'active') as any}>
                        {(selectedUserData.status || 'active').charAt(0).toUpperCase() + (selectedUserData.status || 'active').slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Location</label>
                      <p className="font-medium">{selectedUserData.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Contact Number</label>
                      <p className="font-medium">{selectedUserData.contact_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Join Date</label>
                      <p className="font-medium">{new Date(selectedUserData.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">KYC Status</label>
                      <div className="flex items-center">
                        {selectedUserData.kyc ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={selectedUserData.status === 'active' ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => handleUpdateUserStatus(
                        selectedUserData.id, 
                        selectedUserData.status === 'active' ? 'suspended' : 'active'
                      )}
                      fullWidth
                    >
                      {selectedUserData.status === 'active' ? 'Suspend User' : 'Activate User'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                    >
                      Send Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                    >
                      View Activity Log
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};