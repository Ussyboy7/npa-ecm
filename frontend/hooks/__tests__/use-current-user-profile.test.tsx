import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  AUTH_BROADCAST_CHANNEL: 'auth',
  AUTH_CHANGED_EVENT: 'auth-changed',
  apiFetch: apiFetchMock,
  clearTokens: vi.fn(),
  ensureAuthSession: vi.fn(async () => true),
  hasTokens: () => true,
  isImpersonatingUser: () => false,
}));

import { useCurrentUser } from '../use-current-user';

describe('useCurrentUser profile hydration', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps profile fields from /auth/me without the organization directory', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'user-1',
      username: 'amina',
      email: 'amina@example.com',
      first_name: 'Amina',
      middle_name: 'Bello',
      last_name: 'Yusuf',
      honorific: 'Dr.',
      designation: 'Director, Operations',
      employee_id: 'NPA-001',
      personnel_number: 'PN-001',
      grade_level: 'MSS1',
      system_role_name: 'General Manager',
      permissions: { can_approve: true },
      directorate: 'dir-1',
      division: 'div-1',
      department: 'dept-1',
      directorate_name: 'Operations',
      division_name: 'Operations Division',
      department_name: 'Operations Department',
      is_active: true,
      is_superuser: false,
      phone: '+234-000-0000',
      bio: 'Profile bio',
      profile_photo: 'data:image/jpeg;base64,photo',
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => expect(result.current.currentUser?.honorific).toBe('Dr.'));

    expect(apiFetchMock).toHaveBeenCalledWith('/accounts/auth/me/');
    expect(result.current.currentUser).toMatchObject({
      id: 'user-1',
      name: 'Amina Bello Yusuf',
      honorific: 'Dr.',
      designation: 'Director, Operations',
      systemRole: 'General Manager',
      gradeLevel: 'MSS1',
      directorateName: 'Operations',
      divisionName: 'Operations Division',
      departmentName: 'Operations Department',
      phone: '+234-000-0000',
      bio: 'Profile bio',
      profilePhoto: 'data:image/jpeg;base64,photo',
      active: true,
      rolePermissions: { can_approve: true },
    });
  });
});
