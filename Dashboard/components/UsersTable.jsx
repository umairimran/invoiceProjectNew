import React, { useState, useEffect } from 'react';
import { usersAPI } from '../utils/api';

const UsersTable = ({ data, onEdit, onDelete }) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userPasswords, setUserPasswords] = useState({});
  const [loadingPasswords, setLoadingPasswords] = useState({});
  // No longer need to track password visibility since passwords are always shown

  // Pre-load passwords when component mounts
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Store passwords from the users data if available
      const initialPasswords = {};
      data.forEach(user => {
        if (user && user.id) {
          if (user.password) {
            initialPasswords[user.id] = user.password;
          } else {
            // Fetch any passwords that aren't already available
            fetchUserPassword(user.id);
          }
        }
      });
      setUserPasswords(initialPasswords);
    }
  }, [data]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key || !data || !Array.isArray(data)) return data || [];
    
    return [...data].sort((a, b) => {
      // Skip sorting if either object is null/undefined
      if (!a || !b) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle null/undefined values in sorting
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1; // null values go to end
      if (bValue == null) return -1; // null values go to end
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const getClassNamesFor = (name) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  // Filter data based on search term
  const filteredData = getSortedData()
    .filter(user => user && user.id && user.username) // Remove null/undefined users
    .filter(user => {
      if (!searchTerm) return true;
      
      const searchTermLower = searchTerm.toLowerCase();
      return (
        (user.username || '').toLowerCase().includes(searchTermLower) ||
        (user.email || '').toLowerCase().includes(searchTermLower) ||
        (user.role || '').toLowerCase().includes(searchTermLower)
      );
    });

  const handleDelete = (userId) => {
    setDeleteConfirm(null);
    onDelete(userId);
  };
  
  // Function to fetch a user's password
  const fetchUserPassword = async (userId) => {
    if (userPasswords[userId]) return; // Already fetched
    
    setLoadingPasswords(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await usersAPI.getUserPassword(userId);
      if (response && response.password) {
        setUserPasswords(prev => ({ 
          ...prev, 
          [userId]: response.password 
        }));
      }
    } catch (error) {
      console.error('Error fetching password:', error);
    } finally {
      setLoadingPasswords(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  // Function to ensure we have the password (now just fetches if needed)
  const ensurePasswordLoaded = (userId) => {
    // If we don't have the password yet, fetch it
    if (!userPasswords[userId]) {
      fetchUserPassword(userId);
    }
  };
  
  // Function to copy password to clipboard
  const copyPasswordToClipboard = (userId) => {
    // Find the password for this user
    const user = data.find(u => u.id === userId);
    const password = user?.password || userPasswords[userId];
    
    if (password) {
      navigator.clipboard.writeText(password)
        .then(() => {
          alert('Password copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy password:', err);
        });
    } else {
      fetchUserPassword(userId);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-purple-100 text-purple-800', icon: 'fas fa-user-shield' },
      user: { color: 'bg-green-100 text-green-800', icon: 'fas fa-user' }
    };

    const safeRole = role || 'user';
    const config = roleConfig[safeRole] || roleConfig.user;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <i className={`${config.icon} mr-1`}></i>
        {safeRole.charAt(0).toUpperCase() + safeRole.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Log the type and content for debugging
      console.log('Date value to format:', dateString, typeof dateString);
      
      // Handle both string date and ISO date objects from the API
      const date = typeof dateString === 'string' ? new Date(dateString) : 
                  dateString instanceof Object && dateString.hasOwnProperty('$date') ? 
                  new Date(dateString['$date']) : new Date(dateString);
                  
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'N/A';
    }
  };

  return (
    <div className="card overflow-hidden border-t-4 border-primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-signika font-bold text-xl">Users List</h3>
        <div className="flex items-center">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search users..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('username')}
              >
                <div className="flex items-center">
                  <span>Username</span>
                  <i className={`ml-1 fas ${getClassNamesFor('username') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('username') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('email')}
              >
                <div className="flex items-center">
                  <span>Email</span>
                  <i className={`ml-1 fas ${getClassNamesFor('email') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('email') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('role')}
              >
                <div className="flex items-center">
                  <span>Role</span>
                  <i className={`ml-1 fas ${getClassNamesFor('role') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('role') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('created_at')}
              >
                <div className="flex items-center">
                  <span>Created Date</span>
                  <i className={`ml-1 fas ${getClassNamesFor('created_at') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('created_at') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th className="py-3 px-4 text-left font-helveticaBold">
                <div className="flex items-center">
                  <span>Password</span>
                  <i className="fas fa-key ml-1 text-yellow-500"></i>
                </div>
              </th>
              <th className="py-3 px-4 text-left font-helveticaBold">Actions</th>
            </tr>
          </thead>
          <tbody>
                         {filteredData.map((user) => {
               // Skip rendering if user is null/undefined or missing required fields
               if (!user || !user.id || !user.username) {
                 return null;
               }
               
               return (
                 <tr 
                   key={user.id} 
                   className="border-b border-gray-200 hover:bg-gray-50"
                 >
                   <td className="py-4 px-4">
                     <div className="flex items-center">
                       <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center mr-3">
                         {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                       </div>
                       <span className="font-helvetica">{user.username || 'No Username'}</span>
                     </div>
                   </td>
                   <td className="py-4 px-4 font-helvetica">{user.email || 'No Email'}</td>
                   <td className="py-4 px-4 font-helvetica">
                     {getRoleBadge(user.role)}
                   </td>
                                     <td className="py-4 px-4 font-helvetica">
                    {user.created_at ? (
                      formatDate(user.created_at)
                    ) : 'N/A'}
                  </td>
                  <td className="py-4 px-4 font-helvetica">
                    <div className="flex items-center space-x-2">
                      {/* Password display with toggle */}
                      <div className="flex-grow">
                        <input 
                          type="text"
                          value={
                            loadingPasswords[user.id] 
                              ? "Loading..." 
                              : (user.password || userPasswords[user.id] || "password123")
                          }
                          readOnly
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-secondary focus:border-secondary block w-full p-2"
                        />
                      </div>
                      {/* Copy button */}
                      <button
                        onClick={() => copyPasswordToClipboard(user.id)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg flex-shrink-0"
                        title="Copy Password"
                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onEdit(user)}
                        className="btn btn-sm btn-secondary py-1 px-3"
                        title="Edit User"
                      >
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(user.id)}
                        className="btn btn-sm bg-red-600 text-white hover:bg-red-700 py-1 px-3"
                        title="Delete User"
                      >
                        <i className="fas fa-trash-alt mr-1"></i> Delete
                      </button>
                    </div>
                  </td>
                 </tr>
               );
             })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  {searchTerm ? 'No users found matching your search' : 'No users available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="font-helvetica text-sm text-gray-500">
          Showing {filteredData.length} of {data.length} users
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h3 className="font-signika font-bold text-2xl text-gray-900 mb-2">Confirm Delete</h3>
              <p className="font-helvetica text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-sm bg-gray-300 hover:bg-gray-400 text-gray-800 flex-1 sm:flex-none"
              >
                <i className="fas fa-times mr-2"></i>
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirm)}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
              >
                <i className="fas fa-trash-alt mr-2"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTable;
