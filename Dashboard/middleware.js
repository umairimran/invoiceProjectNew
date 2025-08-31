import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Get auth token from cookies
  const token = req.cookies.get('auth_token')?.value;
  
  // Define public paths that don't require authentication
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !isPublicPath) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // If token exists and trying to access login page, redirect to dashboard
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};