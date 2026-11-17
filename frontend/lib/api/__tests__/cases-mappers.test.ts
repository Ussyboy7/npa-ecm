import { describe, expect, it } from 'vitest';
import { mapApiCase, type ApiCase } from '../cases-mappers';

const apiCase = {
  id: 'case-1',
  case_number: 'CASE-001',
  title: 'Example case',
  case_type: 'general',
  status: 'open',
  priority: 'medium',
  created_by: {
    id: 'user-1',
    first_name: 'Amina',
    middle_name: 'Bello',
    last_name: 'Yusuf',
  },
  assigned_to: {
    id: 'user-2',
    first_name: 'Bala',
    last_name: 'Example',
  },
  opened_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as ApiCase;

describe('mapApiCase', () => {
  it('derives assignee and creator names from nested user fields', () => {
    const mapped = mapApiCase(apiCase);

    expect(mapped.createdById).toBe('user-1');
    expect(mapped.createdByName).toBe('Amina Bello Yusuf');
    expect(mapped.assignedToId).toBe('user-2');
    expect(mapped.assignedToName).toBe('Bala Example');
  });
});
