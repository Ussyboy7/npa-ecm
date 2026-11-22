"use client";

import { useState, useEffect } from "react";
import { apiFetch, hasTokens } from "@/lib/api-client";
import type {
  Directorate,
  Division,
  Department,
} from "@/contexts/OrganizationContext";
import { unwrapResults } from "@/lib/type-utils";
import { DEFAULT_CATALOG_PAGE_SIZE } from '@/lib/pagination-constants';

// Shared mappers (minimal - just enough for dropdown display)
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
    const controller = new AbortController();
    setLoading(true);
    apiFetch<unknown>(`/organization/directorates/?ordering=name&page_size=${DEFAULT_CATALOG_PAGE_SIZE}&page=1`, { signal: controller.signal })
      .then((res) => setItems(unwrapResults<Record<string, unknown>>(res).map(mapDirectorate)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
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
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ ordering: "name", page_size: "200", page: "1" });
    if (directorateId) params.set("directorate", directorateId);
    apiFetch<unknown>(`/organization/divisions/?${params}`, { signal: controller.signal })
      .then((res) => setItems(unwrapResults<Record<string, unknown>>(res).map(mapDivision)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
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
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ ordering: "name", page_size: "200", page: "1" });
    if (divisionId) params.set("division", divisionId);
    apiFetch<unknown>(`/organization/departments/?${params}`, { signal: controller.signal })
      .then((res) => setItems(unwrapResults<Record<string, unknown>>(res).map(mapDepartment)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [divisionId, enabled]);

  return { items, loading };
}
