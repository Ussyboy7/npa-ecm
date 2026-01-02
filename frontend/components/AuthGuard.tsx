"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasTokens } from '@/lib/api-client';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ['/login', '/verify'];

/**
 * Client-side authentication guard
 * This runs after middleware and provides an additional layer of protection
 * by checking localStorage (which middleware can't access)
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip check for public routes
    if (publicRoutes.some(route => pathname?.startsWith(route))) {
      return;
    }

    // Check if user has tokens
    if (!hasTokens()) {
      // Store current path for redirect after login
      const currentPath = pathname + window.location.search;
      sessionStorage.setItem('redirect_after_login', currentPath);
      
      // Redirect to login
      router.push('/login');
    }
  }, [pathname, router]);

  // If on a public route or has tokens, render children
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
  if (isPublicRoute || hasTokens()) {
    return <>{children}</>;
  }

  // Show nothing while redirecting (or show a loading state)
  return null;
}

