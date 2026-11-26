import { describe, expect, it } from 'vitest';
import { describeSearchScope, unitsInScope } from '../search-scope';
import type { SearchScope } from '../api/search';

const scopeAt = (
  level: SearchScope['level'],
  unit: string | null = null,
): SearchScope => ({
  level,
  unit,
  division_ids: null,
  department_ids: null,
});

describe('describeSearchScope', () => {
  it('names the department the search is bounded to', () => {
    expect(describeSearchScope(scopeAt('department', 'Budget'))).toBe(
      'Searching correspondence and cases in Budget, documents you can open, and published public records from every unit.',
    );
  });

  it('falls back to the unit kind when the server sends no name', () => {
    expect(describeSearchScope(scopeAt('division'))).toBe(
      'Searching correspondence and cases in your division, documents you can open, and published public records from every unit.',
    );
  });

  it('says the whole organisation when the scope is org-wide', () => {
    expect(describeSearchScope(scopeAt('all'))).toBe(
      'Searching all correspondence and cases, documents you can open, and published public records from every unit.',
    );
  });

  it('describes participation-only search as what the user handled', () => {
    expect(describeSearchScope(scopeAt('participation'))).toBe(
      'Searching correspondence and cases you handled or your office holds, documents you can open, and published public records from every unit.',
    );
  });

  it('claims nothing when the scope could not be loaded', () => {
    expect(describeSearchScope(null)).toBeNull();
  });
});

describe('unitsInScope', () => {
  const units = [
    { id: 'fin', name: 'Finance' },
    { id: 'legal', name: 'Legal' },
    { id: 'ops', name: 'Operations' },
  ];

  it('keeps the full catalog when the scope is unknown or org-wide', () => {
    expect(unitsInScope(units, null)).toEqual(units);
    expect(unitsInScope(units, undefined)).toEqual(units);
  });

  it('keeps only the units inside the boundary, in catalog order', () => {
    expect(unitsInScope(units, ['ops', 'fin']).map((unit) => unit.id)).toEqual(['fin', 'ops']);
  });

  it('offers nothing when the boundary contains no such unit', () => {
    expect(unitsInScope(units, [])).toEqual([]);
  });
});
