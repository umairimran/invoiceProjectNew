/**
 * Custom fetch wrapper for ngrok
 * This ensures all requests to ngrok have the required headers to bypass the warning page
 */

const ngrokFetch = async (url, options = {}) => {
  const requestOptions = { ...options };

  // Ensure headers object exists
  if (!requestOptions.headers) {
    requestOptions.headers = {};
  }

  // Always add ngrok bypass header
  requestOptions.headers['ngrok-skip-browser-warning'] = 'true';

  // Call the regular fetch with our enhanced options
  return fetch(url, requestOptions);
};

// Override the global fetch to always include ngrok headers
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    const requestOptions = { ...options };

    if (typeof url === 'string' && url.includes('ngrok')) {
      if (!requestOptions.headers) requestOptions.headers = {};
      requestOptions.headers['ngrok-skip-browser-warning'] = 'true';
    }
    return originalFetch(url, requestOptions);
  };
}

export default ngrokFetch;
