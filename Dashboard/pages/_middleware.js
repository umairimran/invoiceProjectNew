// Next.js middleware to add ngrok bypass headers
export function middleware(req) {
  // Get the original response
  const response = NextResponse.next();
  
  // Add ngrok bypass header to all outgoing requests
  response.headers.set('ngrok-skip-browser-warning', 'true');
  response.headers.set('User-Agent', 'InvoiceApp/1.0');
  
  return response;
}
