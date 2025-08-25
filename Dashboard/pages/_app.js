import '../styles/globals.css';
import { useEffect } from 'react';

// Import our ngrok wrapper to activate the global fetch override
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Import ngrok fetch wrapper dynamically (client-side only)
    import('../utils/ngrokFetch');
  }, []);
  
  return <Component {...pageProps} />;
}

export default MyApp;
