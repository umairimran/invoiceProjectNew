/**
 * Custom fetch wrapper for ngrok
 * This ensures all requests to ngrok have the required headers to bypass the warning page
 */

const ngrokFetch = async (url, options = {}) => {
  // Ensure headers object exists
  if (!options.headers) {
    options.headers = {};
  }

  // Always add ngrok bypass header
  options.headers['ngrok-skip-browser-warning'] = 'true';
  
  // Add custom user agent as backup method
  options.headers['User-Agent'] = 'InvoiceApp/1.0';

  // Call the regular fetch with our enhanced options
  return fetch(url, options);
};

// Override the global fetch to always include ngrok headers
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    if (url.includes('ngrok')) {
      if (!options.headers) options.headers = {};
      options.headers['ngrok-skip-browser-warning'] = 'true';
      options.headers['User-Agent'] = 'InvoiceApp/1.0';
    }
    return originalFetch(url, options);
  };
}

export default ngrokFetch;
