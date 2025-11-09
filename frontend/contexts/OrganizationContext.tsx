import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DIRECTORATES, DIVISIONS, DEPARTMENTS, MOCK_USERS, type User } from '@/lib/npa-structure';

const ORG_DATA_VERSION = '2025-02-admin-refresh';
const STORAGE_KEY = 'npa_organization';
const DIRECTORATES_KEY = `${STORAGE_KEY}_directorates`;
const DIVISIONS_KEY = `${STORAGE_KEY}_divisions`;
const DEPARTMENTS_KEY = `${STORAGE_KEY}_departments`;
const ASSIGNMENTS_KEY = `${STORAGE_KEY}_assignments`;

let storagePrepared = false;

const prepareStorage = () => {
  if (storagePrepared || typeof window === 'undefined') return;
  const storedVersion = localStorage.getItem(`${STORAGE_KEY}_version`);
  if (storedVersion !== ORG_DATA_VERSION) {
    localStorage.removeItem(DIRECTORATES_KEY);
    localStorage.removeItem(DIVISIONS_KEY);
    localStorage.removeItem(DEPARTMENTS_KEY);
    localStorage.removeItem(ASSIGNMENTS_KEY);
  }
  storagePrepared = true;
};

export interface Directorate {
  id: string;
  name: string;
  code: string;
  executiveDirectorId?: string;
  isActive: boolean;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  directorateId: string;
  generalManagerId: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  divisionId: string;
  assistantGeneralManagerId?: string;
  isActive: boolean;
}

export interface AssistantAssignment {
  id: string;
  executiveId: string;
  assistantId: string;
  type: 'TA' | 'PA';
  specialization?: string;
  permissions: string[];
}

interface OrganizationContextType {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  assistantAssignments: AssistantAssignment[];
  users: User[];
  addDirectorate: (directorate: Omit<Directorate, 'id'>) => void;
  updateDirectorate: (id: string, updates: Partial<Directorate>) => void;
  deleteDirectorate: (id: string) => void;
  addDivision: (division: Omit<Division, 'id'>) => void;
  updateDivision: (id: string, updates: Partial<Division>) => void;
  deleteDivision: (id: string) => void;
  addDepartment: (department: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addAssignment: (assignment: Omit<AssistantAssignment, 'id'>) => void;
  updateAssignment: (id: string, updates: Partial<AssistantAssignment>) => void;
  deleteAssignment: (id: string) => void;
  resetOrganizationData: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const getBaseDirectorates = (): Directorate[] =>
  DIRECTORATES.map((dir) => ({
    id: dir.id,
    name: dir.name,
    code: dir.code || `DIR-${dir.id.toUpperCase()}`,
    executiveDirectorId: dir.executiveDirectorId || '',
    isActive: dir.active,
  }));

const getBaseDivisions = (): Division[] =>
  DIVISIONS.map((div) => ({
    id: div.id,
    name: div.name,
    code: div.code || `DIV-${div.id}`,
    directorateId: div.directorateId,
    generalManagerId: div.generalManagerId || '',
    isActive: div.active,
  }));

const getBaseDepartments = (): Department[] =>
  DEPARTMENTS.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code || `DEPT-${dept.id}`,
    divisionId: dept.divisionId,
    assistantGeneralManagerId: dept.assistantGeneralManagerId || '',
    isActive: dept.active,
  }));

const getBaseAssignments = (): AssistantAssignment[] => [
  { id: 'assign-1', executiveId: 'user-md', assistantId: 'user-officer-dev', type: 'TA', specialization: 'Finance', permissions: ['view', 'draft', 'schedule'] },
  { id: 'assign-2', executiveId: 'user-md', assistantId: 'user-officer-support', type: 'PA', permissions: ['view', 'schedule', 'coordinate'] },
];

const mergeDirectorates = (base: Directorate[], stored: Directorate[]) => {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const merged: Directorate[] = stored.map((storedItem) => {
    const baseItem = baseMap.get(storedItem.id);
    if (!baseItem) {
      return storedItem;
    }
    baseMap.delete(storedItem.id);
    return {
      ...baseItem,
      isActive: storedItem.isActive ?? baseItem.isActive,
      executiveDirectorId: storedItem.executiveDirectorId || baseItem.executiveDirectorId,
    };
  });

  baseMap.forEach((item) => merged.push(item));
  return merged;
};

const mergeDivisions = (base: Division[], stored: Division[]) => {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const merged: Division[] = stored.map((storedItem) => {
    const baseItem = baseMap.get(storedItem.id);
    if (!baseItem) {
      return storedItem;
    }
    baseMap.delete(storedItem.id);
    return {
      ...baseItem,
      code: storedItem.code || baseItem.code,
      directorateId: storedItem.directorateId || baseItem.directorateId,
      generalManagerId: storedItem.generalManagerId || baseItem.generalManagerId,
      isActive: storedItem.isActive ?? baseItem.isActive,
    };
  });

  baseMap.forEach((item) => merged.push(item));
  return merged;
};

const mergeDepartments = (base: Department[], stored: Department[]) => {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const merged: Department[] = stored.map((storedItem) => {
    const baseItem = baseMap.get(storedItem.id);
    if (!baseItem) {
      return storedItem;
    }
    baseMap.delete(storedItem.id);
    return {
      ...baseItem,
      code: storedItem.code || baseItem.code,
      divisionId: storedItem.divisionId || baseItem.divisionId,
      assistantGeneralManagerId: storedItem.assistantGeneralManagerId || baseItem.assistantGeneralManagerId,
      isActive: storedItem.isActive ?? baseItem.isActive,
    };
  });

  baseMap.forEach((item) => merged.push(item));
  return merged;
};

const initializeDirectorates = (): Directorate[] => {
  if (typeof window === 'undefined') {
    return getBaseDirectorates();
  }

  prepareStorage();
  const storedRaw = localStorage.getItem(DIRECTORATES_KEY);
  const base = getBaseDirectorates();
  if (!storedRaw) return base;
  try {
    const stored = JSON.parse(storedRaw) as Directorate[];
    return mergeDirectorates(base, stored);
  } catch (error) {
    console.warn('Failed to parse stored directorates. Using base data.', error);
    return base;
  }
};

const initializeDivisions = (): Division[] => {
  if (typeof window === 'undefined') {
    return getBaseDivisions();
  }

  prepareStorage();
  const storedRaw = localStorage.getItem(DIVISIONS_KEY);
  const base = getBaseDivisions();
  if (!storedRaw) return base;
  try {
    const stored = JSON.parse(storedRaw) as Division[];
    return mergeDivisions(base, stored);
  } catch (error) {
    console.warn('Failed to parse stored divisions. Using base data.', error);
    return base;
  }
};

const initializeDepartments = (): Department[] => {
  if (typeof window === 'undefined') {
    return getBaseDepartments();
  }

  prepareStorage();
  const storedRaw = localStorage.getItem(DEPARTMENTS_KEY);
  const base = getBaseDepartments();
  if (!storedRaw) return base;
  try {
    const stored = JSON.parse(storedRaw) as Department[];
    return mergeDepartments(base, stored);
  } catch (error) {
    console.warn('Failed to parse stored departments. Using base data.', error);
    return base;
  }
};

const initializeAssignments = (): AssistantAssignment[] => {
  if (typeof window === 'undefined') {
    return getBaseAssignments();
  }

  prepareStorage();
  const storedRaw = localStorage.getItem(ASSIGNMENTS_KEY);
  if (!storedRaw) return getBaseAssignments();
  try {
    return JSON.parse(storedRaw) as AssistantAssignment[];
  } catch (error) {
    console.warn('Failed to parse stored assistant assignments. Using base data.', error);
    return getBaseAssignments();
  }
};

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [directorates, setDirectorates] = useState<Directorate[]>(initializeDirectorates);
  const [divisions, setDivisions] = useState<Division[]>(initializeDivisions);
  const [departments, setDepartments] = useState<Department[]>(initializeDepartments);
  const [assistantAssignments, setAssistantAssignments] = useState<AssistantAssignment[]>(initializeAssignments);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DIRECTORATES_KEY, JSON.stringify(directorates));
      localStorage.setItem(`${STORAGE_KEY}_version`, ORG_DATA_VERSION);
    }
  }, [directorates]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DIVISIONS_KEY, JSON.stringify(divisions));
      localStorage.setItem(`${STORAGE_KEY}_version`, ORG_DATA_VERSION);
    }
  }, [divisions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
      localStorage.setItem(`${STORAGE_KEY}_version`, ORG_DATA_VERSION);
    }
  }, [departments]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assistantAssignments));
      localStorage.setItem(`${STORAGE_KEY}_version`, ORG_DATA_VERSION);
    }
  }, [assistantAssignments]);

  const addDirectorate = (directorate: Omit<Directorate, 'id'>) => {
    const newDirectorate: Directorate = {
      ...directorate,
      id: `dir-${Date.now()}`,
    };
    setDirectorates((prev) => [...prev, newDirectorate]);
  };

  const updateDirectorate = (id: string, updates: Partial<Directorate>) => {
    setDirectorates((prev) => prev.map((dir) => (dir.id === id ? { ...dir, ...updates } : dir)));
  };

  const deleteDirectorate = (id: string) => {
    setDirectorates((prev) => prev.map((dir) => (dir.id === id ? { ...dir, isActive: false } : dir)));
  };

  const addDivision = (division: Omit<Division, 'id'>) => {
    const newDivision: Division = { ...division, id: `div-${Date.now()}` };
    setDivisions((prev) => [...prev, newDivision]);
  };

  const updateDivision = (id: string, updates: Partial<Division>) => {
    setDivisions((prev) => prev.map((div) => (div.id === id ? { ...div, ...updates } : div)));
  };

  const deleteDivision = (id: string) => {
    setDivisions((prev) => prev.map((div) => (div.id === id ? { ...div, isActive: false } : div)));
  };

  const addDepartment = (department: Omit<Department, 'id'>) => {
    const newDepartment: Department = { ...department, id: `dept-${Date.now()}` };
    setDepartments((prev) => [...prev, newDepartment]);
  };

  const updateDepartment = (id: string, updates: Partial<Department>) => {
    setDepartments((prev) => prev.map((dept) => (dept.id === id ? { ...dept, ...updates } : dept)));
  };

  const deleteDepartment = (id: string) => {
    setDepartments((prev) => prev.map((dept) => (dept.id === id ? { ...dept, isActive: false } : dept)));
  };

  const addAssignment = (assignment: Omit<AssistantAssignment, 'id'>) => {
    const newAssignment: AssistantAssignment = { ...assignment, id: `assign-${Date.now()}` };
    setAssistantAssignments((prev) => [...prev, newAssignment]);
  };

  const updateAssignment = (id: string, updates: Partial<AssistantAssignment>) => {
    setAssistantAssignments((prev) => prev.map((assign) => (assign.id === id ? { ...assign, ...updates } : assign)));
  };

  const deleteAssignment = (id: string) => {
    setAssistantAssignments((prev) => prev.filter((assign) => assign.id !== id));
  };

  const resetOrganizationData = () => {
    const baseDirectorates = getBaseDirectorates();
    const baseDivisions = getBaseDivisions();
    const baseDepartments = getBaseDepartments();
    const baseAssignments = getBaseAssignments();

    setDirectorates(baseDirectorates);
    setDivisions(baseDivisions);
    setDepartments(baseDepartments);
    setAssistantAssignments(baseAssignments);

    if (typeof window !== 'undefined') {
      localStorage.setItem(DIRECTORATES_KEY, JSON.stringify(baseDirectorates));
      localStorage.setItem(DIVISIONS_KEY, JSON.stringify(baseDivisions));
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(baseDepartments));
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(baseAssignments));
      localStorage.setItem(`${STORAGE_KEY}_version`, ORG_DATA_VERSION);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        directorates,
        divisions,
        departments,
        assistantAssignments,
        users: MOCK_USERS,
        addDirectorate,
        updateDirectorate,
        deleteDirectorate,
        addDivision,
        updateDivision,
        deleteDivision,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        resetOrganizationData,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
