import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import UsersTable from '../components/UsersTable';
import UserModal from '../components/UserModal';
import RoleGuard from '../components/RoleGuard';
import { usersAPI } from '../utils/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0
  });

  // Fetch users data
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersAPI.getAll();
      setUsers(data);
      
      // Calculate metrics
      const adminUsers = data.filter(user => user.role === 'admin').length;
      const regularUsers = data.filter(user => user.role === 'user').length;
      
      setMetrics({
        totalUsers: data.length,
        adminUsers,
        regularUsers
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new user
  const handleCreateUser = async (userData) => {
    try {
      console.log('handleCreateUser called with:', userData);
      const newUser = await usersAPI.create(userData);
      console.log('User created successfully:', newUser);
      console.log('Created at value:', newUser.created_at);
      
      setUsers([...users, newUser]);
      
      // Update metrics
      setMetrics({
        ...metrics,
        totalUsers: metrics.totalUsers + 1,
        adminUsers: userData.role === 'admin' ? metrics.adminUsers + 1 : metrics.adminUsers,
        regularUsers: userData.role === 'user' ? metrics.regularUsers + 1 : metrics.regularUsers
      });
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Set a user-friendly error message
      if (error.message && error.message.includes('Email already registered')) {
        throw new Error('A user with this email already exists. Please use a different email address.');
      }
      
      throw error;
    }
  };

  // Handle updating a user
  const handleUpdateUser = async (userId, userData) => {
    try {
      console.log('handleUpdateUser called with:', { userId, userData });
      const updatedUser = await usersAPI.update(userId, userData);
      console.log('User updated successfully:', updatedUser);
      
      // Update users list
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      );
      setUsers(updatedUsers);
      
      // Update metrics if role changed
      const oldUser = users.find(user => user.id === userId);
      if (oldUser && userData.role && oldUser.role !== userData.role) {
        if (oldUser.role === 'admin' && userData.role === 'user') {
          setMetrics({
            ...metrics,
            adminUsers: metrics.adminUsers - 1,
            regularUsers: metrics.regularUsers + 1
          });
        } else if (oldUser.role === 'user' && userData.role === 'admin') {
          setMetrics({
            ...metrics,
            adminUsers: metrics.adminUsers + 1,
            regularUsers: metrics.regularUsers - 1
          });
        }
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Handle deleting a user
  const handleDeleteUser = async (userId) => {
    try {
      await usersAPI.delete(userId);
      
      // Find user before removing from list
      const deletedUser = users.find(user => user.id === userId);
      
      // Update users list
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      
      // Update metrics
      if (deletedUser) {
        setMetrics({
          ...metrics,
          totalUsers: metrics.totalUsers - 1,
          adminUsers: deletedUser.role === 'admin' ? metrics.adminUsers - 1 : metrics.adminUsers,
          regularUsers: deletedUser.role === 'user' ? metrics.regularUsers - 1 : metrics.regularUsers
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  // Open modal for editing
  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  // Open modal for creating
  const handleCreateNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  // Submit handler for modal
  const handleSubmitUser = async (userId, userData) => {
    try {
      console.log('handleSubmitUser called with:', { userId, userData });
      
      if (userId && userId !== null && userId !== undefined) {
        console.log('Editing user:', userId);
        // Editing existing user
        return await handleUpdateUser(userId, userData);
      } else {
        console.log('Creating new user');
        // Creating new user - userData contains the form data
        return await handleCreateUser(userData);
      }
    } catch (error) {
      console.error('Error in handleSubmitUser:', error);
      
      // Make sure the error is properly formatted for the modal
      if (error.message) {
        throw error; // Re-throw the error so the modal can handle it
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <RoleGuard allowedRoles={['admin']} redirectTo="/">
      <Layout title="Users Management | Medpush DMCC">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="title">Users Management</h1>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>
              Add New User
            </button>
          </div>
          <p className="text-gray-600 mt-2 font-helvetica">
            Manage system users and their access permissions
          </p>
        </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <i className="fas fa-exclamation-circle text-red-500 mt-1 mr-3"></i>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card border-t-4 border-primary">
          <div className="flex items-center">
            <div className="bg-primary rounded-lg p-3 mr-4">
              <i className="fas fa-users text-white text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-primary">{metrics.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="card border-t-4 border-purple-500">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3 mr-4">
              <i className="fas fa-user-shield text-white text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Admin Users</p>
              <p className="text-2xl font-bold text-purple-500">{metrics.adminUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="card border-t-4 border-green-500">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3 mr-4">
              <i className="fas fa-user text-white text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Regular Users</p>
              <p className="text-2xl font-bold text-green-500">{metrics.regularUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-3xl text-secondary mb-4"></i>
            <p className="font-helvetica text-gray-600">Loading users...</p>
          </div>
        </div>
      ) : (
        /* Users Table */
        <UsersTable 
          data={users} 
          onEdit={handleEditUser} 
          onDelete={handleDeleteUser}
        />
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        onSubmit={handleSubmitUser}
      />
    </Layout>
    </RoleGuard>
  );
}
