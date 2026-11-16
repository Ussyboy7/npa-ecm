import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ACCESS_COOKIE_NAME, LEGACY_ACCESS_COOKIE_NAME } from './lib/auth-cookies';

const isPublicPath = (pathname: string) => (
  pathname === '/'
  || pathname === '/login'
  || pathname.startsWith('/login/')
  || pathname === '/set-password'
  || pathname.startsWith('/set-password/')
  || pathname === '/verify'
  || pathname.startsWith('/verify/')
  || pathname === '/auth/callback'
  || pathname.startsWith('/auth/callback/')
  || pathname === '/foia/public'
  || pathname.startsWith('/foia/public/')
);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  if (isPublicPath(pathname)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const token = request.cookies.get(AUTH_ACCESS_COOKIE_NAME)?.value
    ?? request.cookies.get(LEGACY_ACCESS_COOKIE_NAME)?.value
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)).*)',
  ],
};
