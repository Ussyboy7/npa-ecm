import { describe, expect, it } from 'vitest';
import { asString, isRecord, unwrapResults } from './type-utils';

describe('type-utils', () => {
  it('isRecord narrows objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('asString coerces values', () => {
    expect(asString('hello')).toBe('hello');
    expect(asString(null, 'fallback')).toBe('fallback');
    expect(asString(42)).toBe('42');
  });

  it('unwrapResults handles arrays and paginated payloads', () => {
    expect(unwrapResults([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(unwrapResults({ results: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(unwrapResults({ count: 0 })).toEqual([]);
  });
});
