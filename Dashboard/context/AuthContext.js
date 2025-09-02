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
        // Get token from localStorage
        const token = localStorage.getItem('auth_token');
        
        // Check if token exists in localStorage but not in cookies
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1];
          
        // Sync localStorage and cookies
        if (token && !cookieToken) {
          // If token exists in localStorage but not in cookie, set the cookie
          document.cookie = `auth_token=${token}; path=/; max-age=${60*60*24*7}`; // 7 days
          console.log('Restored auth_token cookie from localStorage');
        } else if (!token && cookieToken) {
          // If token exists in cookie but not in localStorage, set localStorage
          localStorage.setItem('auth_token', cookieToken);
          console.log('Restored auth_token in localStorage from cookie');
        }
        
        // Now check if we have a valid token in either place
        const validToken = token || cookieToken;
        
        if (validToken) {
          // Token exists, try to get current user data
          const userData = await authAPI.getCurrentUser();
          if (userData) {
            setUser(userData);
          } else {
            // Invalid token, clean up
            localStorage.removeItem('auth_token');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Clear both localStorage and cookie on error
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await authAPI.login(email, password);
      console.log('Login response:', response);
      
      // Handle case where API returns null (e.g., 401 error)
      if (response === null) {
        console.log('Login failed: API returned null');
        return { success: false, error: 'Incorrect email or password. Please check your credentials and try again.' };
      }
      
      if (response && response.access_token) {
        // Save token to localStorage for fetch requests
        localStorage.setItem('auth_token', response.access_token);
        
        // Also save in a cookie for middleware/server-side auth
        // Use SameSite=Lax to ensure cookie is sent with navigation requests
        document.cookie = `auth_token=${response.access_token}; path=/; max-age=${60*60*24*7}; SameSite=Lax`; // 7 days
        
        // Fetch user profile after successful login
        try {
          const userData = await authAPI.getCurrentUser();
          if (userData) {
            setUser(userData);
            return { success: true };
          } else {
            // If getCurrentUser returns null but we have a token, something's wrong
            console.error('Got token but could not fetch user data');
            localStorage.removeItem('auth_token');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            return { success: false, error: 'Could not fetch user data' };
          }
        } catch (userError) {
          console.error('Error fetching user data after login:', userError);
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          return { success: false, error: 'Could not fetch user data after login' };
        }
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login failed:', error);
      // Make sure to clean up any partial state
      localStorage.removeItem('auth_token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Extract meaningful error message from the error
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.message) {
        // Check for specific authentication errors
        if (error.message.includes('Incorrect email or password')) {
          errorMessage = 'Incorrect email or password. Please check your credentials and try again.';
        } else if (error.message.includes('email and password are required')) {
          errorMessage = 'Please enter both email and password.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Incorrect email or password. Please check your credentials and try again.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Please check your email and password format.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          // Use the actual error message if it's meaningful
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('auth_token');
    
    // Clear cookie - make sure to use the same path
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    
    // Clear user state
    setUser(null);
    
    // Redirect to login page
    console.log('Logging out and redirecting to login page');
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
