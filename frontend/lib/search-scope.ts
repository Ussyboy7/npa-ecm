/** One sentence describing what a search covers, for the page-level scope note. */

import type { SearchScope } from '@/lib/api/search';

const OPEN_DOCUMENTS = 'documents you can open';
const PUBLIC_RECORDS = 'published public records from every unit';

const correspondenceAndCases = (scope: SearchScope): string => {
  switch (scope.level) {
    case 'all':
      return 'all correspondence and cases';
    case 'directorate':
      return `correspondence and cases in ${scope.unit ?? 'your directorate'}`;
    case 'division':
      return `correspondence and cases in ${scope.unit ?? 'your division'}`;
    case 'department':
      return `correspondence and cases in ${scope.unit ?? 'your department'}`;
    default:
      return 'correspondence and cases you handled or your office holds';
  }
};

/**
 * Sentence for the search scope note, or null when the scope is unknown so the
 * page shows nothing rather than a claim it cannot stand behind.
 */
export const describeSearchScope = (scope: SearchScope | null): string | null => {
  if (!scope) return null;

  return `Searching ${correspondenceAndCases(scope)}, ${OPEN_DOCUMENTS}, and ${PUBLIC_RECORDS}.`;
};

/**
 * Units a filter may offer. `null`/`undefined` means the scope is unknown or
 * unrestricted, so the full catalog stays available.
 */
export const unitsInScope = <T extends { id: string }>(
  units: T[],
  allowedIds: string[] | null | undefined,
): T[] => {
  if (!allowedIds) return units;

  const allowed = new Set(allowedIds);
  return units.filter((unit) => allowed.has(unit.id));
};
