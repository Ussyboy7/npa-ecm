/**
 * Routing utility functions
 * Extracted from modals for reusability and consistency
 */

import { getDivisionById, getDepartmentById, type User } from './npa-structure';

/**
 * Filter users by search query
 */
export function filterUsersBySearch(
  users: User[],
  searchQuery: string,
  options?: {
    includeDivision?: boolean;
    includeDepartment?: boolean;
    includeEmail?: boolean;
  }
): User[] {
  if (!searchQuery.trim()) return users;

  const query = searchQuery.toLowerCase();
  const {
    includeDivision = true,
    includeDepartment = true,
    includeEmail = true,
  } = options || {};

  return users.filter((user) => {
    const nameMatch = user.name.toLowerCase().includes(query);
    const emailMatch = includeEmail && user.email.toLowerCase().includes(query);
    const roleMatch = user.systemRole.toLowerCase().includes(query);
    const division = user.division ? getDivisionById(user.division) : null;
    const divisionMatch = includeDivision && (division?.name.toLowerCase().includes(query) || false);
    const department = user.department ? getDepartmentById(user.department) : null;
    const departmentMatch = includeDepartment && (department?.name.toLowerCase().includes(query) || false);

    return nameMatch || emailMatch || roleMatch || divisionMatch || departmentMatch;
  });
}
