import { describe, expect, it } from 'vitest';

import {
  buildClassificationPolicy,
  describeClassification,
  gradeReachesSensitivity,
} from '@/lib/classification-policy';

const servedPayload = {
  sensitivities: [
    { value: 'public', label: 'Public', grades: [], unrestricted: true },
    { value: 'internal', label: 'Internal', grades: [], unrestricted: true },
    {
      value: 'confidential',
      label: 'Confidential',
      grades: ['MDCS', 'EDCS', 'MSS1', 'MSS2'],
      unrestricted: false,
    },
    {
      value: 'restricted',
      label: 'Restricted',
      grades: ['MDCS', 'EDCS', 'MSS1'],
      unrestricted: false,
    },
  ],
};

describe('buildClassificationPolicy', () => {
  it('reads the served grades and labels', () => {
    const policy = buildClassificationPolicy(servedPayload);

    expect(policy.confidential.grades).toEqual(['MDCS', 'EDCS', 'MSS1', 'MSS2']);
    expect(policy.confidential.label).toBe('Confidential');
    expect(policy.confidential.unrestricted).toBe(false);
    expect(policy.restricted.grades).toEqual(['MDCS', 'EDCS', 'MSS1']);
  });

  it('treats an empty grade list as unrestricted', () => {
    const policy = buildClassificationPolicy({
      sensitivities: [{ value: 'public', label: 'Public', grades: [] }],
    });

    expect(policy.public.unrestricted).toBe(true);
    expect(gradeReachesSensitivity(policy.public, 'JSS3')).toBe(true);
  });

  it('never invents a restriction when the payload is unusable', () => {
    const policy = buildClassificationPolicy(null);

    expect(policy.confidential.grades).toEqual([]);
    expect(policy.confidential.unrestricted).toBe(true);
    expect(gradeReachesSensitivity(policy.confidential, 'SSS2')).toBe(true);
  });
});

describe('gradeReachesSensitivity', () => {
  const policy = buildClassificationPolicy(servedPayload);

  it('follows the served list for a restricted classification', () => {
    expect(gradeReachesSensitivity(policy.restricted, 'MSS1')).toBe(true);
    expect(gradeReachesSensitivity(policy.restricted, 'MSS2')).toBe(false);
    expect(gradeReachesSensitivity(policy.restricted, null)).toBe(false);
  });

  it('lets every grade through an unrestricted classification', () => {
    expect(gradeReachesSensitivity(policy.internal, 'JSS1')).toBe(true);
  });
});

describe('describeClassification', () => {
  it('summarises the served rule', () => {
    const policy = buildClassificationPolicy(servedPayload);

    expect(describeClassification(policy.restricted)).toBe('limited to MDCS, EDCS, MSS1');
    expect(describeClassification(policy.public)).toBe('all authenticated users');
  });
});
