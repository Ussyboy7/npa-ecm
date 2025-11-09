"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@/lib/npa-structure";
import { useOrganization } from "@/contexts/OrganizationContext";

export const DEMO_USER_STORAGE_KEY = "npa_demo_user_id";

interface UseCurrentUserOptions {
  reload?: boolean;
}

export const useCurrentUser = () => {
  const { users } = useOrganization();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const activeUsers = users.filter((user) => user.active);
    if (activeUsers.length === 0) {
      setHydrated(true);
      return;
    }

    const savedId = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (savedId && activeUsers.some((user) => user.id === savedId)) {
      setCurrentUserId(savedId);
      setIsDemo(true);
    } else {
      const fallback =
        activeUsers.find((user) => user.gradeLevel === "MDCS") ?? activeUsers[0];
      if (fallback) {
        setCurrentUserId(fallback.id);
        localStorage.setItem(DEMO_USER_STORAGE_KEY, fallback.id);
        setIsDemo(true);
      }
    }

    setHydrated(true);
  }, [users]);

  const currentUser: User | null = useMemo(() => {
    if (!currentUserId) return null;
    return users.find((user) => user.id === currentUserId) ?? null;
  }, [users, currentUserId]);

  const selectUser = (userId: string, options?: UseCurrentUserOptions) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
    setCurrentUserId(userId);
    setIsDemo(true);

    if (options?.reload ?? true) {
      window.location.reload();
    }
  };

  const clearDemoUser = (options?: UseCurrentUserOptions) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setIsDemo(false);
    setCurrentUserId(null);

    if (options?.reload ?? true) {
      window.location.reload();
    }
  };

  return {
    currentUser,
    isDemo,
    hydrated,
    selectUser,
    clearDemoUser,
  };
};

