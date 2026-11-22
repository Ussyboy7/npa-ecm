import { describe, expect, it } from 'vitest';
import { getFirstActiveOfficeId, getSelectableOffices } from '../office-choice-utils';

const offices = [
  { id: 'active-1', name: 'Active One', isActive: true },
  { id: 'active-2', name: 'Active Two', isActive: true },
  { id: 'inactive-member', name: 'Inactive Member Office', isActive: false },
  { id: 'inactive-other', name: 'Inactive Other Office', isActive: false },
];

describe('getSelectableOffices', () => {
  it('offers active offices and preserves a selected inactive office', () => {
    expect(getSelectableOffices(offices, { selectedOfficeId: 'inactive-member' })).toEqual([
      offices[0],
      offices[1],
      offices[2],
    ]);
  });

  it('keeps choices within membership scope, including selected inactive memberships only', () => {
    const memberOfficeIds = new Set(['active-1', 'inactive-member']);

    expect(getSelectableOffices(offices, {
      allowedOfficeIds: memberOfficeIds,
      selectedOfficeId: 'inactive-member',
    })).toEqual([offices[0], offices[2]]);
    expect(getSelectableOffices(offices, {
      allowedOfficeIds: memberOfficeIds,
      selectedOfficeId: 'inactive-other',
    })).toEqual([offices[0]]);
  });

  it('defaults to the first active office in membership order', () => {
    expect(getFirstActiveOfficeId(offices, ['inactive-member', 'active-2', 'active-1'])).toBe('active-2');
    expect(getFirstActiveOfficeId(offices, ['inactive-member', 'inactive-other'])).toBeUndefined();
  });

  it('does not cap large active-office lists', () => {
    const largeOfficeList = Array.from({ length: 125 }, (_, index) => ({
      id: `office-${index}`,
      name: `Office ${index}`,
      isActive: true,
    }));

    expect(getSelectableOffices(largeOfficeList)).toHaveLength(125);
  });
});
