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

export default ngrokFetch;
