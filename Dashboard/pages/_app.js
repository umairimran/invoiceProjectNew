import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../context/AuthContext';
import AuthGuard from '../components/AuthGuard';
import RouteProgressBar from '../components/RouteProgressBar';

// Import our ngrok wrapper to activate the global fetch override
function MyApp({ Component, pageProps }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Import ngrok fetch wrapper dynamically (client-side only)
    import('../utils/ngrokFetch');
  }, []);

  // Thin top progress bar on route change — layout stays visible to avoid flicker
  useEffect(() => {
    const handleStart = (url) => {
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

  const getLayout = Component.getLayout || ((page) => page);

  return (
    <AuthProvider>
      <AuthGuard>
        <RouteProgressBar visible={isNavigating} />
        {getLayout(<Component {...pageProps} />)}
      </AuthGuard>
    </AuthProvider>
  );
}

export default MyApp;
