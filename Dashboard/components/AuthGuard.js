import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

// Public routes that don't require authentication
const publicRoutes = ['/login'];

/**
 * AuthGuard component to protect routes that require authentication
 * Redirects to login page if not authenticated
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip auth check for public routes
    if (publicRoutes.includes(router.pathname)) {
      return;
    }

    // If auth has been checked (not loading) and user is not authenticated
    if (!loading && !isAuthenticated) {
      router.push({
        pathname: '/login',
        query: { from: router.asPath !== '/login' ? router.asPath : undefined }
      });
    }
  }, [isAuthenticated, loading, router]);

  // Show children for public routes without waiting
  if (publicRoutes.includes(router.pathname)) {
    return <>{children}</>;
  }

  // For protected routes, show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner message="Authenticating..." />;
  }
  
  // For protected routes, show children only when authenticated
  return isAuthenticated ? <>{children}</> : <LoadingSpinner message="Redirecting to login..." />;
}
