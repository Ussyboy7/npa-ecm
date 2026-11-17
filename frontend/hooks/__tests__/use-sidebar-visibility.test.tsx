import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pageAccessFetch = vi.hoisted(() => vi.fn(async () => ({
  pages: {
    dashboard: { allowed: true },
    my_inbox: { allowed: true },
    office_inbox: { allowed: true },
  },
})));

const state = vi.hoisted(() => ({
  currentUser: {
    id: 'user-1',
    rolePermissions: {
      can_minute_correspondence: true,
      can_register_correspondence: true,
    } as Record<string, boolean>,
    division: 'division-1',
  },
  org: {
    officeMemberships: [] as Array<Record<string, unknown>>,
    assistantAssignments: [] as Array<Record<string, unknown>>,
    roles: [] as Array<Record<string, unknown>>,
    offices: [] as Array<Record<string, unknown>>,
    myOfficeMembershipsLoaded: false,
    isOrganizationReady: true,
  },
}));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ currentUser: state.currentUser }),
}));

vi.mock('@/hooks/use-role-checks', () => ({
  useRoleChecks: () => ({
    isSuperAdmin: false,
    isSecretary: false,
    isRegistry: false,
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => state.org,
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: pageAccessFetch,
}));

import {
  invalidatePagePermissionsCache,
  useSidebarVisibility,
} from '../use-sidebar-visibility';

beforeEach(() => {
  invalidatePagePermissionsCache();
  pageAccessFetch.mockClear();
  state.currentUser = {
    id: 'user-1',
    rolePermissions: {
      can_minute_correspondence: true,
      can_register_correspondence: true,
    } as Record<string, boolean>,
    division: 'division-1',
  };
  state.org = {
    officeMemberships: [],
    assistantAssignments: [],
    roles: [],
    offices: [],
    myOfficeMembershipsLoaded: false,
    isOrganizationReady: true,
  };
});

afterEach(() => {
  cleanup();
});

describe('useSidebarVisibility', () => {
  it('waits for both page permissions and office memberships before revealing gated links', async () => {
    const { result, rerender } = renderHook(() => useSidebarVisibility());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isVisibilityReady).toBe(false);
    expect(result.current.showMyInbox).toBe(false);
    expect(result.current.showOfficeInbox).toBe(false);

    state.org = {
      ...state.org,
      officeMemberships: [
        {
          userId: 'user-1',
          officeId: 'office-1',
          assignmentRole: 'principal',
          isActive: true,
        },
      ],
      myOfficeMembershipsLoaded: true,
    };
    rerender();

    await waitFor(() => {
      expect(result.current.isVisibilityReady).toBe(true);
    });
    expect(result.current.showMyInbox).toBe(true);
    expect(result.current.showOfficeInbox).toBe(true);
  });

  it('shares one page-permissions request across multiple visibility consumers', async () => {
    state.org.myOfficeMembershipsLoaded = true;

    const { result } = renderHook(() => ({
      sidebar: useSidebarVisibility(),
      page: useSidebarVisibility(),
    }));

    await waitFor(() => {
      expect(result.current.sidebar.isVisibilityReady).toBe(true);
      expect(result.current.page.isVisibilityReady).toBe(true);
    });

    expect(pageAccessFetch).toHaveBeenCalledTimes(1);
  });

  it('waits for the full organization bootstrap before revealing the shell', async () => {
    state.org = {
      ...state.org,
      officeMemberships: [{ userId: 'user-1', officeId: 'office-1', assignmentRole: 'staff', isActive: true }],
      myOfficeMembershipsLoaded: true,
      isOrganizationReady: false,
    };

    const { result, rerender } = renderHook(() => useSidebarVisibility());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isVisibilityReady).toBe(false);

    state.org.isOrganizationReady = true;
    rerender();

    await waitFor(() => expect(result.current.isVisibilityReady).toBe(true));
  });

  it('exposes Organization Acting to active office members without admin permissions', async () => {
    state.org = {
      ...state.org,
      officeMemberships: [{ userId: 'user-1', officeId: 'office-1', assignmentRole: 'staff', isActive: true }],
      myOfficeMembershipsLoaded: true,
    };

    const { result } = renderHook(() => useSidebarVisibility());

    await waitFor(() => expect(result.current.isVisibilityReady).toBe(true));
    expect(result.current.showOrganizationActing).toBe(true);
    expect(result.current.showOrganizationOffices).toBe(false);
    expect(result.current.showAdministration).toBe(true);
  });

  it('exposes Organization Acting to user managers without structure-management permission', async () => {
    state.currentUser = {
      ...state.currentUser,
      rolePermissions: { can_manage_users: true },
    };
    state.org.myOfficeMembershipsLoaded = true;

    const { result } = renderHook(() => useSidebarVisibility());

    await waitFor(() => {
      expect(result.current.isVisibilityReady).toBe(true);
    });
    expect(result.current.showOrganizationActing).toBe(true);
    expect(result.current.showOrganizationOffices).toBe(false);
  });
});
