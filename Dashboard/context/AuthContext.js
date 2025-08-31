import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '../utils/api';

// Create the authentication context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if there's a saved token and fetch user data on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Token exists, try to get current user data
          const userData = await authAPI.getCurrentUser();
          if (userData) {
            setUser(userData);
          } else {
            // Invalid token, clean up
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response && response.access_token) {
        // Save token to localStorage for fetch requests
        localStorage.setItem('auth_token', response.access_token);
        
        // Also save in a cookie for middleware/server-side auth
        document.cookie = `auth_token=${response.access_token}; path=/; max-age=${60*60*24*7}`; // 7 days
        
        // Fetch user profile after successful login
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
        
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('auth_token');
    
    // Clear cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    setUser(null);
    router.push('/login');
  };

  // Authentication context value
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
