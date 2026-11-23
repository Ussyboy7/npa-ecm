import { describe, expect, it } from 'vitest';

import {
  buildGradeCatalog,
  getGradeInfo,
  getGradeRelationshipLabel,
  getGradeSeniority,
  getSuperiorGrade,
  gradeHasTier,
} from '@/lib/grade-catalog';

const servedPayload = {
  grades: [
    {
      code: 'MDCS',
      rank: 0,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: true,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'EDCS',
      rank: 1,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: true,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'MSS1',
      rank: 2,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: false,
      division_leadership: true,
      department_leadership: false,
    },
    {
      code: 'MSS4',
      rank: 3,
      management: true,
      senior_management: false,
      executive: false,
      leadership: false,
      directorate_leadership: false,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'JSS3',
      rank: 4,
      management: false,
      senior_management: false,
      executive: false,
      leadership: false,
      directorate_leadership: false,
      division_leadership: false,
      department_leadership: false,
    },
  ],
};

describe('buildGradeCatalog', () => {
  it('keeps the served order and indexes every grade', () => {
    const catalog = buildGradeCatalog(servedPayload);

    expect(catalog.grades.map((grade) => grade.code)).toEqual([
      'MDCS',
      'EDCS',
      'MSS1',
      'MSS4',
      'JSS3',
    ]);
    expect(getGradeInfo(catalog, 'mss4')?.rank).toBe(3);
  });

  it('reads the served tiers', () => {
    const catalog = buildGradeCatalog(servedPayload);

    expect(gradeHasTier(catalog, 'MSS1', 'seniorManagement')).toBe(true);
    expect(gradeHasTier(catalog, 'MSS4', 'seniorManagement')).toBe(false);
    expect(gradeHasTier(catalog, 'MSS1', 'divisionLeadership')).toBe(true);
    expect(gradeHasTier(catalog, 'MSS1', 'departmentLeadership')).toBe(false);
  });

  it('returns no guidance for an unusable payload', () => {
    const catalog = buildGradeCatalog(null);

    expect(catalog.grades).toEqual([]);
    expect(getGradeInfo(catalog, 'MDCS')).toBeUndefined();
    expect(gradeHasTier(catalog, 'MDCS', 'management')).toBe(false);
    expect(getGradeSeniority(catalog, 'MDCS')).toBe(-1);
  });
});

const onBehalfPayload = {
  grades: [
    { code: 'MDCS', rank: 0 },
    { code: 'EDCS', rank: 1 },
    { code: 'GMCS', rank: 2 },
    { code: 'AGMCS', rank: 3 },
    { code: 'MSS1', rank: 4 },
    { code: 'MSS2', rank: 5 },
  ],
};

describe('on-behalf-of grades', () => {
  const catalog = buildGradeCatalog(onBehalfPayload);

  it('takes the next more senior served grade', () => {
    expect(getSuperiorGrade(catalog, 'MSS1')?.code).toBe('AGMCS');
    expect(getSuperiorGrade(catalog, 'AGMCS')?.code).toBe('GMCS');
    expect(getSuperiorGrade(catalog, 'EDCS')?.code).toBe('MDCS');
    expect(getSuperiorGrade(catalog, 'MDCS')).toBeUndefined();
    expect(getSuperiorGrade(catalog, 'UNKNOWN')).toBeUndefined();
    expect(getSuperiorGrade(null, 'MSS1')).toBeUndefined();
  });

  it('keeps the existing relationship wording for served rank distances', () => {
    expect(getGradeRelationshipLabel(catalog, 'MSS1', 'AGMCS')).toBe(
      'Your Direct Supervisor',
    );
    expect(getGradeRelationshipLabel(catalog, 'MSS1', 'GMCS')).toBe(
      'Your Director',
    );
    expect(getGradeRelationshipLabel(catalog, 'MSS2', 'MDCS')).toBe(
      'Executive Level',
    );
    expect(getGradeRelationshipLabel(catalog, 'MDCS', 'MSS1')).toBe(
      'Supervisor',
    );
  });

  it('returns no relationship label without both graded users', () => {
    expect(getGradeRelationshipLabel(catalog, null, 'MDCS')).toBe('');
    expect(getGradeRelationshipLabel(catalog, 'MSS1', undefined)).toBe('');
  });

  it('falls back to Supervisor when a grade is not served', () => {
    expect(getGradeRelationshipLabel(null, 'MSS1', 'MSS2')).toBe('Supervisor');
    expect(getGradeRelationshipLabel(catalog, 'MSS1', 'UNKNOWN')).toBe('Supervisor');
  });
});

describe('getGradeSeniority', () => {
  const catalog = buildGradeCatalog(servedPayload);

  it('scores the top grade highest', () => {
    expect(getGradeSeniority(catalog, 'MDCS')).toBe(4);
    expect(getGradeSeniority(catalog, 'JSS3')).toBe(0);
    expect(getGradeSeniority(catalog, 'MDCS')).toBeGreaterThan(
      getGradeSeniority(catalog, 'EDCS'),
    );
  });

  it('does not rank a grade the server did not send', () => {
    expect(getGradeSeniority(catalog, 'GMCS')).toBe(-1);
    expect(getGradeSeniority(catalog, null)).toBe(-1);
  });
});
