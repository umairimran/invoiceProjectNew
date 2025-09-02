import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../context/AuthContext';
import AuthGuard from '../components/AuthGuard';
import LoadingSpinner from '../components/LoadingSpinner';

// Import our ngrok wrapper to activate the global fetch override
function MyApp({ Component, pageProps }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Import ngrok fetch wrapper dynamically (client-side only)
    import('../utils/ngrokFetch');
  }, []);

  // Handle route change events for loading states
  useEffect(() => {
    const handleStart = (url) => {
      // Don't show loading for same page navigation or hash changes
      if (url !== router.asPath && !url.includes('#')) {
        setIsNavigating(true);
      }
    };

    const handleComplete = () => {
      setIsNavigating(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);
  
  // Use getLayout pattern if available on the page, otherwise use default layout
  const getLayout = Component.getLayout || ((page) => page);
  
  return (
    <AuthProvider>
      <AuthGuard>
        {isNavigating ? (
          <LoadingSpinner message="Loading page..." showProgress={true} />
        ) : (
          getLayout(<Component {...pageProps} />)
        )}
      </AuthGuard>
    </AuthProvider>
  );
}

export default MyApp;
