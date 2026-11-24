'use client';

import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationCatalogKey } from '@/lib/organization-types';

/**
 * Access the organization catalogs (offices, directorates, divisions,
 * departments), loading the requested ones on first use.
 *
 * Use this instead of `useOrganization` in forms, filters and lookup tables so
 * routes that need no catalog data do not fetch ~30 KB of offices at startup.
 * Passing no keys loads all four catalogs.
 */
export function useOrganizationCatalogs(...catalogs: OrganizationCatalogKey[]) {
  const organization = useOrganization();
  const { ensureCatalogs } = organization;
  // Keyed by which catalogs were requested, not by array identity.
  const catalogKey = catalogs.join(',');

  useEffect(() => {
    if (typeof ensureCatalogs !== 'function') return;
    void ensureCatalogs(...(catalogKey ? (catalogKey.split(',') as OrganizationCatalogKey[]) : []));
  }, [ensureCatalogs, catalogKey]);

  return organization;
}
