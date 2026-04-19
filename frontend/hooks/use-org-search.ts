"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, hasTokens } from "@/lib/api-client";
import type {
  Directorate,
  Division,
  Department,
  Office,
} from "@/contexts/OrganizationContext";
import type { User } from "@/lib/npa-structure";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const unwrapResults = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && "results" in payload) {
    const r = (payload as { results?: unknown }).results;
    return Array.isArray(r) ? r.filter(isRecord) : [];
  }
  return [];
};

// Shared mappers (minimal - just enough for dropdown display)
const mapOffice = (o: Record<string, unknown>): Office => ({
  id: String(o.id ?? ""),
  name: String(o.name ?? "Office"),
  code: String(o.code ?? ""),
  officeType: String(o.office_type ?? "custom"),
  directorateId: o.directorate ? String((o.directorate as Record<string, unknown>).id ?? o.directorate) : undefined,
  divisionId: o.division ? String((o.division as Record<string, unknown>).id ?? o.division) : undefined,
  departmentId: o.department ? String((o.department as Record<string, unknown>).id ?? o.department) : undefined,
  parentId: o.parent ? String((o.parent as Record<string, unknown>).id ?? o.parent) : undefined,
  description: String(o.description ?? ""),
  isActive: Boolean(o.is_active ?? true),
  allowExternalIntake: Boolean(o.allow_external_intake ?? true),
  allowLateralRouting: Boolean(o.allow_lateral_routing ?? true),
});

const mapDirectorate = (d: Record<string, unknown>): Directorate => ({
  id: String(d.id ?? ""),
  name: String(d.name ?? "Directorate"),
  code: String(d.code ?? ""),
  description: String(d.description ?? ""),
  isActive: Boolean(d.is_active ?? true),
});

const mapDivision = (d: Record<string, unknown>): Division => ({
  id: String(d.id ?? ""),
  name: String(d.name ?? "Division"),
  code: String(d.code ?? ""),
  directorateId: String((d.directorate as Record<string, unknown>)?.id ?? d.directorate ?? ""),
  generalManagerId: d.general_manager ? String((d.general_manager as Record<string, unknown>).id ?? d.general_manager) : null,
  isActive: Boolean(d.is_active ?? true),
});

const mapDepartment = (d: Record<string, unknown>): Department => ({
  id: String(d.id ?? ""),
  name: String(d.name ?? "Department"),
  code: String(d.code ?? ""),
  divisionId: String((d.division as Record<string, unknown>)?.id ?? d.division ?? ""),
  assistantGeneralManagerId: d.head_of_department ? String((d.head_of_department as Record<string, unknown>).id ?? d.head_of_department) : null,
  isActive: Boolean(d.is_active ?? true),
});

const mapUser = (u: Record<string, unknown>): User => {
  const first = String(u.first_name ?? "").trim();
  const last = String(u.last_name ?? "").trim();
  const name = `${first} ${last}`.trim() || String(u.username ?? "User");
  const roleObj = u.system_role as Record<string, unknown> | undefined;
  const roleName = roleObj && typeof roleObj.name === "string" ? roleObj.name : String(u.system_role_name ?? "");
  return {
    id: String(u.id ?? u.username ?? ""),
    username: typeof u.username === "string" ? u.username : undefined,
    name,
    email: String(u.email ?? ""),
    employeeId: typeof u.employee_id === "string" ? u.employee_id : "",
    gradeLevel: typeof u.grade_level === "string" ? u.grade_level : "",
    systemRole: roleName,
    directorate: u.directorate ? String((u.directorate as Record<string, unknown>)?.id ?? u.directorate) : undefined,
    division: u.division ? String((u.division as Record<string, unknown>)?.id ?? u.division) : undefined,
    department: u.department ? String((u.department as Record<string, unknown>)?.id ?? u.department) : undefined,
    avatar: undefined,
    active: Boolean(u.is_active ?? true),
    isSuperuser: Boolean(u.is_superuser ?? false),
  };
};

const DEBOUNCE_MS = 300;

/** Hook to search offices with optional filters. Fetches when search or filters change (debounced). */
export function useOfficesSearch(options: {
  search: string;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  enabled?: boolean;
}) {
  const { search, directorateId, divisionId, departmentId, enabled = true } = options;
  const [items, setItems] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch_ = useCallback(async () => {
    if (!hasTokens() || !enabled) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "name");
      params.set("page_size", "50");
      params.set("page", "1");
      if (search.trim()) params.set("search", search.trim());
      if (directorateId) params.set("directorate", directorateId);
      if (divisionId) params.set("division", divisionId);
      if (departmentId) params.set("department", departmentId);
      const res = await apiFetch<unknown>(`/organization/offices/?${params}`);
      setItems(unwrapResults(res).map(mapOffice));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, directorateId, divisionId, departmentId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetch_, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetch_, enabled]);

  return { items, loading };
}

/** Hook to search users. Fetches when search changes (debounced). */
export function useUsersSearch(options: { search: string; enabled?: boolean }) {
  const { search, enabled = true } = options;
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch_ = useCallback(async () => {
    if (!hasTokens() || !enabled) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("is_active", "true");
      params.set("ordering", "username");
      params.set("page_size", "50");
      params.set("page", "1");
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<unknown>(`/accounts/users/?${params}`);
      setItems(unwrapResults(res).map(mapUser));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetch_, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetch_, enabled]);

  return { items, loading };
}

/** Fetch directorates (small set, no search needed for initial load). */
export function useDirectoratesSearch(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [items, setItems] = useState<Directorate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasTokens() || !enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<unknown>("/organization/directorates/?ordering=name&page_size=200&page=1")
      .then((res) => {
        if (!cancelled) setItems(unwrapResults(res).map(mapDirectorate));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  return { items, loading };
}

/** Fetch divisions, optionally filtered by directorate. */
export function useDivisionsSearch(options: { directorateId?: string | null; enabled?: boolean }) {
  const { directorateId, enabled = true } = options;
  const [items, setItems] = useState<Division[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasTokens() || !enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ ordering: "name", page_size: "200", page: "1" });
    if (directorateId) params.set("directorate", directorateId);
    apiFetch<unknown>(`/organization/divisions/?${params}`)
      .then((res) => {
        if (!cancelled) setItems(unwrapResults(res).map(mapDivision));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [directorateId, enabled]);

  return { items, loading };
}

/** Fetch departments, optionally filtered by division. */
export function useDepartmentsSearch(options: { divisionId?: string | null; enabled?: boolean }) {
  const { divisionId, enabled = true } = options;
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasTokens() || !enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ ordering: "name", page_size: "200", page: "1" });
    if (divisionId) params.set("division", divisionId);
    apiFetch<unknown>(`/organization/departments/?${params}`)
      .then((res) => {
        if (!cancelled) setItems(unwrapResults(res).map(mapDepartment));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [divisionId, enabled]);

  return { items, loading };
}
