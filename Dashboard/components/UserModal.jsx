import React, { useState, useEffect } from 'react';

const UserModal = ({ isOpen, onClose, user, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!user;
  
  // Debug logging
  console.log('UserModal render:', { user, isEditing, isOpen });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '', // Don't populate password for editing
        role: user.role || 'user'
      });
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('UserModal handleSubmit called:', { isEditing, user, formData });
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({}); // Clear previous errors
      
      if (isEditing) {
        console.log('Editing user:', user.id);
        // Only include password if it's provided
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await onSubmit(user.id, updateData);
      } else {
        console.log('Creating new user');
        // For new users, pass null as userId and formData as userData
        await onSubmit(null, formData);
      }
      
      // Only close modal if no errors occurred
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred while submitting the form';
      
      if (error.message) {
        if (error.message.includes('Email already registered')) {
          errorMessage = 'A user with this email already exists. Please use a different email address.';
          setErrors({ email: 'This email is already registered' });
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid data provided. Please check your input.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-signika font-bold text-xl">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-helvetica font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-helvetica font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-helvetica font-bold mb-2" htmlFor="password">
              Password {isEditing && <span className="font-normal text-gray-500 text-sm">(Leave blank to keep current)</span>}
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={isEditing ? "Enter new password" : "Enter password"}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block font-helvetica font-bold mb-2" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-300 hover:bg-gray-400 text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                isEditing ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
