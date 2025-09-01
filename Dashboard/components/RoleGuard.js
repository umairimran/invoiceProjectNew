import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * RoleGuard component to protect routes based on user roles
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authorized
 * @param {Array<string>} props.allowedRoles - Array of roles that are allowed to access the route
 * @param {string} props.redirectTo - Path to redirect to when unauthorized (default: '/')
 */
export default function RoleGuard({ children, allowedRoles, redirectTo = '/' }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth has been checked (not loading) and user is authenticated but not authorized
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.push(redirectTo);
    }
  }, [user, loading, router, allowedRoles, redirectTo]);

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner message="Checking permissions..." />;
  }
  
  // If user is not authorized, show loading spinner while redirecting
  if (!user || !allowedRoles.includes(user.role)) {
    return <LoadingSpinner message="Unauthorized. Redirecting..." />;
  }
  
  // User is authorized, render children
  return <>{children}</>;
}
