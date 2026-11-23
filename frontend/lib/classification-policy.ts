"use client";

import { apiFetch } from "./api-client";
import { logWarn } from "./client-logger";
import type { DocumentSensitivity } from "./dms-types";
import { isRecord } from "./type-utils";

/**
 * One classification rule, served by the backend.
 *
 * The grade lists come from `common/grade_utils` through
 * `dms.visibility.sensitivity_grade_requirements`, so the dialog warnings, the
 * sensitivity picker and its clearance badges all read what the server
 * enforces instead of keeping their own copies that can drift.
 */
export interface ClassificationRule {
  value: DocumentSensitivity;
  label: string;
  /** Grades that reach this classification, highest first. */
  grades: string[];
  /** True when every authenticated user reaches it, whatever their grade. */
  unrestricted: boolean;
}

export type ClassificationPolicy = Record<DocumentSensitivity, ClassificationRule>;

const SENSITIVITIES: readonly DocumentSensitivity[] = [
  'public',
  'internal',
  'confidential',
  'restricted',
];

const isSensitivity = (value: string): value is DocumentSensitivity =>
  (SENSITIVITIES as readonly string[]).includes(value);

/** True when a reader of this grade may reach documents of this sensitivity. */
export const gradeReachesSensitivity = (
  rule: ClassificationRule,
  gradeLevel: string | null | undefined,
): boolean => rule.unrestricted || rule.grades.includes(gradeLevel ?? '');

/** Sentence-ready summary of who may reach a classification. */
export const describeClassification = (rule: ClassificationRule): string =>
  rule.unrestricted ? 'all authenticated users' : `limited to ${rule.grades.join(', ')}`;

/**
 * Map the endpoint payload onto every sensitivity.
 *
 * A missing row falls back to unrestricted so a failed load never invents a
 * restriction the server does not enforce; the server still gates the request.
 */
export const buildClassificationPolicy = (payload: unknown): ClassificationPolicy => {
  const rows =
    isRecord(payload) && Array.isArray(payload.sensitivities)
      ? payload.sensitivities.filter(isRecord)
      : [];

  const parsed = new Map<DocumentSensitivity, ClassificationRule>();
  rows.forEach((row) => {
    const value = typeof row.value === 'string' ? row.value : '';
    if (!isSensitivity(value)) return;
    const grades = Array.isArray(row.grades)
      ? row.grades.filter((grade): grade is string => typeof grade === 'string')
      : [];
    parsed.set(value, {
      value,
      label: typeof row.label === 'string' && row.label ? row.label : value,
      grades,
      unrestricted: row.unrestricted === true || grades.length === 0,
    });
  });

  return SENSITIVITIES.reduce((policy, value) => {
    policy[value] =
      parsed.get(value) ?? { value, label: value, grades: [], unrestricted: true };
    return policy;
  }, {} as ClassificationPolicy);
};

let cachedPolicy: ClassificationPolicy | null = null;
let pendingRequest: Promise<ClassificationPolicy> | null = null;

export const getCachedClassificationPolicy = (): ClassificationPolicy | null => cachedPolicy;

/** Test hook — the policy is fetched once per session. */
export const resetClassificationPolicyCache = (): void => {
  cachedPolicy = null;
  pendingRequest = null;
};

export const fetchClassificationPolicy = (): Promise<ClassificationPolicy> => {
  if (cachedPolicy) return Promise.resolve(cachedPolicy);
  if (!pendingRequest) {
    pendingRequest = apiFetch<unknown>('/dms/classification-policy/')
      .then((payload) => {
        cachedPolicy = buildClassificationPolicy(payload);
        return cachedPolicy;
      })
      .catch((error: unknown) => {
        logWarn('Failed to load classification policy', error);
        throw error;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
};
