import { NextResponse } from 'next/server';

// This middleware runs on all requests
export function middleware(request) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  // Add the ngrok bypass headers
  requestHeaders.set('ngrok-skip-browser-warning', 'true');
  requestHeaders.set('User-Agent', 'InvoiceApp/1.0');

  // Return the response with the modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    // Apply to all API requests
    '/api/:path*',
  ],
};
