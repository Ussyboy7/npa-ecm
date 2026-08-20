import type { User } from '@/lib/npa-structure';

export interface Directorate {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  description?: string;
  executiveDirectorId?: string;
  isActive: boolean;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  directorateId: string;
  generalManagerId?: string | null;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  divisionId: string;
  assistantGeneralManagerId?: string | null;
  isActive: boolean;
}

export interface Office {
  id: string;
  name: string;
  code: string;
  officeType: string;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  parentId?: string | null;
  description?: string;
  isActive: boolean;
  allowExternalIntake: boolean;
  allowLateralRouting: boolean;
  locationId?: string | null;
  locationName?: string | null;
}

export interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
  description: string;
  isActive: boolean;
  displayName: string;
}

export interface OfficeMembership {
  id: string;
  officeId: string;
  officeName?: string;
  userId: string;
  assignmentRole: string;
  isPrimary: boolean;
  canRegister: boolean;
  canRoute: boolean;
  canApprove: boolean;
  startsAt?: string;
  endsAt?: string;
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

export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: Record<string, boolean>;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateRoleInput = {
  name: string;
  description?: string;
  isActive?: boolean;
  permissions?: Record<string, boolean>;
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

export interface OrganizationContextType {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  assistantAssignments: AssistantAssignment[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users: User[];
  roles: Role[];
  addRole: (role: CreateRoleInput) => Promise<Role>;
  updateRole: (id: string, updates: UpdateRoleInput) => Promise<Role>;
  deleteRole: (id: string) => Promise<void>;
  addDirectorate: (directorate: CreateDirectorateInput) => Promise<Directorate>;
  updateDirectorate: (id: string, updates: UpdateDirectorateInput) => Promise<Directorate | null>;
  deleteDirectorate: (id: string) => Promise<Directorate | null>;
  addDivision: (division: CreateDivisionInput) => Promise<Division>;
  updateDivision: (id: string, updates: UpdateDivisionInput) => Promise<Division | null>;
  deleteDivision: (id: string) => Promise<Division | null>;
  addDepartment: (department: CreateDepartmentInput) => Promise<Department>;
  updateDepartment: (id: string, updates: UpdateDepartmentInput) => Promise<Department | null>;
  deleteDepartment: (id: string) => Promise<Department | null>;
  addAssignment: (assignment: Omit<AssistantAssignment, 'id'>) => Promise<AssistantAssignment>;
  updateAssignment: (id: string, updates: Partial<AssistantAssignment>) => Promise<AssistantAssignment>;
  deleteAssignment: (id: string) => Promise<void>;
  addOfficeMembership: (membership: Omit<OfficeMembership, 'id' | 'officeName'>) => Promise<OfficeMembership>;
  updateOfficeMembership: (id: string, updates: Partial<Omit<OfficeMembership, 'id' | 'officeName'>>) => Promise<OfficeMembership>;
  deleteOfficeMembership: (id: string) => Promise<void>;
  resetOrganizationData: () => void;
  refreshOrganizationData: () => Promise<void>;
  isSyncing: boolean;
  updateUser: (id: string, updates: UpdateUserInput) => Promise<User>;
  addUser: (user: CreateUserInput) => Promise<User>;
}

export type CreateDirectorateInput = {
  name: string;
  code: string;
  description?: string;
  executiveDirectorId?: string | null;
  isActive?: boolean;
};

export type UpdateDirectorateInput = Partial<CreateDirectorateInput>;

export type CreateDivisionInput = {
  name: string;
  code: string;
  directorateId: string;
  generalManagerId?: string | null;
  isActive?: boolean;
};

export type UpdateDivisionInput = Partial<CreateDivisionInput>;

export type CreateDepartmentInput = {
  name: string;
  code: string;
  divisionId: string;
  assistantGeneralManagerId?: string | null;
  isActive?: boolean;
};

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export type CreateUserInput = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  systemRole?: string | null;
  gradeLevel?: string | null;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
  employeeId?: string | null;
};

export type UpdateUserInput = {
  username?: string;
  firstName?: string;
  lastName?: string;
  systemRole?: string | null;
  gradeLevel?: string | null;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
  email?: string;
  employeeId?: string | null;
  password?: string;
};
