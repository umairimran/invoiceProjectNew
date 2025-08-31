import '../styles/globals.css';
import { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';
import AuthGuard from '../components/AuthGuard';

// Import our ngrok wrapper to activate the global fetch override
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Import ngrok fetch wrapper dynamically (client-side only)
    import('../utils/ngrokFetch');
  }, []);
  
  // Use getLayout pattern if available on the page, otherwise use default layout
  const getLayout = Component.getLayout || ((page) => page);
  
  return (
    <AuthProvider>
      <AuthGuard>
        {getLayout(<Component {...pageProps} />)}
      </AuthGuard>
    </AuthProvider>
  );
}

export default MyApp;
