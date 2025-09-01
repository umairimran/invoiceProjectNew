import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Get auth token from cookies
  const token = req.cookies.get('auth_token')?.value;
  
  // Define public paths that don't require authentication
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);
  
  // Define admin-only paths
  // Note: This is a basic check. The actual role verification happens client-side in RoleGuard
  const adminOnlyPaths = ['/users'];
  const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path));
  
  // Special handling for API routes and static assets - always allow
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !isPublicPath) {
    console.log(`Middleware: No auth token, redirecting from ${pathname} to /login`);
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // If token exists and trying to access login page, redirect to dashboard
  if (token && isPublicPath) {
    console.log(`Middleware: Auth token exists, redirecting from ${pathname} to /`);
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  // For admin-only paths, we'll let the RoleGuard component handle the authorization
  // The middleware only handles authentication (token presence)
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};