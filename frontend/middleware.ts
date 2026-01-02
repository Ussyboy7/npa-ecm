import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/login',
  '/verify', // Document verification pages
];

/**
 * Check if a route is public
 */
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(route => pathname.startsWith(route));
};

/**
 * Check if user has valid authentication tokens
 * Since middleware runs on the edge, we check for a cookie that's set when tokens exist
 */
const hasValidAuth = (request: NextRequest): boolean => {
  // Check for auth cookie (set by the app when tokens are stored)
  const authCookie = request.cookies.get('npa_ecm_authenticated');
  
  // Also check for access token in cookie (if backend sets it)
  const accessToken = request.cookies.get('access_token');
  
  // If either cookie exists, consider user authenticated
  // The actual token validation happens on the client side
  return !!authCookie || !!accessToken;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internal routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  if (!hasValidAuth(request)) {
    // Store the intended destination
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    
    // Set a cookie to track that we're redirecting (for client-side check)
    const response = NextResponse.redirect(redirectUrl);
    
    // Store redirect path in a cookie that the client can read
    response.cookies.set('redirect_after_login', pathname, {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      sameSite: 'lax',
    });
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};

