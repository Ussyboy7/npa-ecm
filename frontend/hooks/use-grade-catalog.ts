"use client";

import { useSyncExternalStore } from "react";

import {
  getGradeCatalogSnapshot,
  subscribeToGradeCatalog,
  type GradeCatalog,
} from "@/lib/grade-catalog";

/**
 * The served grade catalogue, loaded with the user bootstrap.
 *
 * Returns null until the request settles; callers fall back to no grade
 * guidance rather than guessing an order or a tier the server did not send.
 * The catalogue is published before the signed-in user, so a component that
 * only mounts once the user exists already sees it.
 */
export const useGradeCatalog = (): GradeCatalog | null =>
  useSyncExternalStore(
    subscribeToGradeCatalog,
    getGradeCatalogSnapshot,
    getGradeCatalogSnapshot,
  );
