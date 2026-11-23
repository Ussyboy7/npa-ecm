"use client";

import { apiFetch } from "./api-client";
import { logWarn } from "./client-logger";
import { isRecord } from "./type-utils";

/**
 * One grade in the hierarchy the server routes on.
 *
 * The order and the leadership tiers come from `common/grade_utils` through
 * `GET /organization/grades/`, so routing, delegation and role checks read the
 * same catalogue instead of keeping their own copies that can drift.
 */
export interface GradeInfo {
  code: string;
  /** Position in the served order: 0 is the most senior grade. */
  rank: number;
  management: boolean;
  seniorManagement: boolean;
  executive: boolean;
  leadership: boolean;
  /** Heads a directorate. True for the MD as well; check `rank` 0 first. */
  directorateLeadership: boolean;
  divisionLeadership: boolean;
  departmentLeadership: boolean;
}

export type GradeTier = Exclude<keyof GradeInfo, "code" | "rank">;

export interface GradeCatalog {
  /** Highest grade first, as the server orders them. */
  grades: GradeInfo[];
  byCode: Record<string, GradeInfo>;
}

const toBoolean = (value: unknown): boolean => value === true;

export const buildGradeCatalog = (payload: unknown): GradeCatalog => {
  const rows =
    isRecord(payload) && Array.isArray(payload.grades)
      ? payload.grades.filter(isRecord)
      : [];

  const grades: GradeInfo[] = [];
  const byCode: Record<string, GradeInfo> = {};

  rows.forEach((row, index) => {
    const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : "";
    if (!code || byCode[code]) return;
    const info: GradeInfo = {
      code,
      rank:
        typeof row.rank === "number" && Number.isFinite(row.rank) ? row.rank : index,
      management: toBoolean(row.management),
      seniorManagement: toBoolean(row.senior_management),
      executive: toBoolean(row.executive),
      leadership: toBoolean(row.leadership),
      directorateLeadership: toBoolean(row.directorate_leadership),
      divisionLeadership: toBoolean(row.division_leadership),
      departmentLeadership: toBoolean(row.department_leadership),
    };
    grades.push(info);
    byCode[code] = info;
  });

  return { grades, byCode };
};

/** A grade row by code, tolerating the casing stored on a user. */
export const getGradeInfo = (
  catalog: GradeCatalog | null | undefined,
  code: string | null | undefined,
): GradeInfo | undefined => {
  if (!catalog || !code) return undefined;
  return catalog.byCode[code.trim().toUpperCase()];
};

/** Seniority score: larger is more senior, -1 when the grade is not served. */
export const getGradeSeniority = (
  catalog: GradeCatalog | null | undefined,
  code: string | null | undefined,
): number => {
  const info = getGradeInfo(catalog, code);
  if (!catalog || !info) return -1;
  return catalog.grades.length - 1 - info.rank;
};

/**
 * The next more senior served grade, used for on-behalf-of choices.
 *
 * Returns undefined at the top of the hierarchy and for grades the server did
 * not send, so callers offer no choices rather than guessing a neighbour.
 */
export const getSuperiorGrade = (
  catalog: GradeCatalog | null | undefined,
  code: string | null | undefined,
): GradeInfo | undefined => {
  const info = getGradeInfo(catalog, code);
  if (!catalog || !info || info.rank <= 0) return undefined;
  return catalog.grades.find((grade) => grade.rank === info.rank - 1);
};

/**
 * How a served superior relates to the current user, by rank distance.
 *
 * The wording and its thresholds are the ones the on-behalf-of picker always
 * showed; only the distance now comes from the served order instead of a
 * second grade list with its own numbering.
 */
export const getGradeRelationshipLabel = (
  catalog: GradeCatalog | null | undefined,
  currentCode: string | null | undefined,
  superiorCode: string | null | undefined,
): string => {
  if (!currentCode || !superiorCode) return "";
  const current = getGradeInfo(catalog, currentCode);
  const superior = getGradeInfo(catalog, superiorCode);
  if (!current || !superior) return "Supervisor";

  const gradeDiff = current.rank - superior.rank;
  if (gradeDiff === 1) return "Your Direct Supervisor";
  if (gradeDiff === 2) return "Your Director";
  if (gradeDiff >= 3) return "Executive Level";
  return "Supervisor";
};

/**
 * True when ``code`` is the same grade as ``minimumCode`` or more senior.
 *
 * Use this for a cut-off such as "Principal Manager and above"; the named tier
 * flags describe the management bands, not every feature's threshold.
 */
export const gradeIsAtLeast = (
  catalog: GradeCatalog | null | undefined,
  code: string | null | undefined,
  minimumCode: string | null | undefined,
): boolean => {
  const info = getGradeInfo(catalog, code);
  const minimum = getGradeInfo(catalog, minimumCode);
  if (!info || !minimum) return false;
  return info.rank <= minimum.rank;
};

/** True when the grade carries the served tier. */
export const gradeHasTier = (
  catalog: GradeCatalog | null | undefined,
  code: string | null | undefined,
  tier: GradeTier,
): boolean => Boolean(getGradeInfo(catalog, code)?.[tier]);

let cachedCatalog: GradeCatalog | null = null;
let pendingRequest: Promise<GradeCatalog> | null = null;
const catalogSubscribers = new Set<() => void>();

const publishCatalog = (next: GradeCatalog | null): void => {
  cachedCatalog = next;
  catalogSubscribers.forEach((notify) => notify());
};

export const getCachedGradeCatalog = (): GradeCatalog | null => cachedCatalog;

/** Snapshot used by `useGradeCatalog` (React `useSyncExternalStore`). */
export const getGradeCatalogSnapshot = (): GradeCatalog | null => cachedCatalog;

export const subscribeToGradeCatalog = (onChange: () => void): (() => void) => {
  catalogSubscribers.add(onChange);
  return () => {
    catalogSubscribers.delete(onChange);
  };
};

/** Test hook — the catalogue is fetched once per session. */
export const resetGradeCatalogCache = (): void => {
  pendingRequest = null;
  publishCatalog(null);
};

/**
 * Load the catalogue once per session. The user bootstrap awaits this before
 * publishing the signed-in user, so no consumer ever sees grade flags for a
 * user they have not been resolved against.
 */
export const fetchGradeCatalog = (): Promise<GradeCatalog> => {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
  if (!pendingRequest) {
    pendingRequest = apiFetch<unknown>("/organization/grades/")
      .then((payload) => {
        publishCatalog(buildGradeCatalog(payload));
        return cachedCatalog as GradeCatalog;
      })
      .catch((error: unknown) => {
        logWarn("Failed to load grade catalog", error);
        throw error;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
};
