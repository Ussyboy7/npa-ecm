"use client";

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { getDefaultHomePath } from '@/lib/home-route';

export function useHomePath(): '/dashboard' | '/inbox' {
  const { currentUser } = useCurrentUser();

  return useMemo(() => {
    if (!currentUser) return '/inbox';
    return getDefaultHomePath();
  }, [currentUser]);
}
