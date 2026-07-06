"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollapsedGroups,
  saveCollapsedGroups,
  getGroupOrder,
} from "@/lib/role-switcher-storage";
import type { User, Directorate, Division, Department } from "@/lib/npa-structure";

export function useRoleSwitcherGroups(
  directorates: Directorate[],
  divisions: Division[],
  departments: Department[],
) {
  const directorateMap = useMemo(
    () => new Map(directorates.map((dir) => [dir.id, dir])),
    [directorates],
  );
  const divisionMap = useMemo(
    () => new Map(divisions.map((div) => [div.id, div])),
    [divisions],
  );
  const departmentMap = useMemo(
    () => new Map(departments.map((dept) => [dept.id, dept])),
    [departments],
  );

  const getDirectorateNameForUser = useCallback(
    (user: User): string | undefined => {
      const explicitDirectorate = user.directorate ? directorateMap.get(user.directorate) : undefined;
      if (explicitDirectorate) return explicitDirectorate.name;

      if (user.division) {
        const division = divisionMap.get(user.division);
        if (division) {
          const parentDirectorate = division.directorateId ? directorateMap.get(division.directorateId) : undefined;
          if (parentDirectorate) return parentDirectorate.name;
        }
      }

      if (user.department) {
        const department = departmentMap.get(user.department);
        if (department) {
          const division = department.divisionId ? divisionMap.get(department.divisionId) : undefined;
          if (division?.directorateId) {
            const parentDirectorate = directorateMap.get(division.directorateId);
            if (parentDirectorate) return parentDirectorate.name;
          }
        }
      }

      return undefined;
    },
    [departmentMap, directorateMap, divisionMap],
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(getCollapsedGroups());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupOrder, _setGroupOrder] = useState<string[]>(getGroupOrder());

  useEffect(() => {
    saveCollapsedGroups(collapsedGroups);
  }, [collapsedGroups]);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const toggleGroupExpand = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  return {
    directorateMap,
    divisionMap,
    departmentMap,
    getDirectorateNameForUser,
    collapsedGroups,
    expandedGroups,
    groupOrder,
    toggleGroupCollapse,
    toggleGroupExpand,
  };
}
