/**
 * Shared UserSelector component
 * Reusable user selection dropdown with search and filtering
 */

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, User as UserIcon } from 'lucide-react';
import {
  getDivisionById,
  getDepartmentById,
  getDirectorateById,
  type User,
} from '@/lib/npa-structure';
import { filterUsersBySearch } from '@/lib/routing-utils';
import type { Office, OfficeMembership } from '@/lib/npa-structure';

interface UserSelectorProps {
  users: User[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  excludeUsers?: Set<string>;
  showSuggested?: boolean;
  suggestedUser?: User | null;
  isSuggestedAssistant?: boolean;
  groupByHierarchy?: boolean;
  currentUser?: User;
  offices?: Office[];
  officeMemberships?: OfficeMembership[];
  maxHeight?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export const UserSelector = ({
  users,
  value,
  onValueChange,
  label,
  placeholder = 'Select recipient',
  required = false,
  error,
  excludeUsers = new Set(),
  showSuggested = false,
  suggestedUser = null,
  isSuggestedAssistant = false,
  groupByHierarchy = false,
  currentUser,
  offices = [],
  officeMemberships = [],
  maxHeight = '400px',
  searchPlaceholder = 'Search by name, email, role, or division...',
  emptyMessage,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: UserSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out excluded users
  const availableUsers = useMemo(() => {
    return users.filter((user) => !excludeUsers.has(user.id));
  }, [users, excludeUsers]);

  // Filter by search query
  const filteredUsers = useMemo(() => {
    return filterUsersBySearch(availableUsers, searchQuery, {
      includeDivision: true,
      includeDepartment: true,
      includeEmail: true,
    });
  }, [availableUsers, searchQuery]);

  // Group users by hierarchy if requested
  const groupedUsers = useMemo(() => {
    if (!groupByHierarchy || !currentUser) {
      return null;
    }

    const division = currentUser.division ? getDivisionById(currentUser.division) : null;
    const currentDirectorateId = division?.directorateId ?? currentUser.directorate ?? null;
    const currentDirectorateObj = currentDirectorateId ? getDirectorateById(currentDirectorateId) : null;
    const currentDirectorateName = currentDirectorateObj?.name ?? null;

    const grouped = new Map<string, typeof filteredUsers>();

    filteredUsers.forEach((user) => {
      const userDivision = user.division ? getDivisionById(user.division) : null;
      const userDirectorateId = userDivision?.directorateId ?? user.directorate ?? null;
      const userDirectorate = userDirectorateId ? getDirectorateById(userDirectorateId) : null;

      const userOfficeMembership = officeMemberships.find(
        (m) => m.userId === user.id && m.isPrimary && m.isActive
      );
      const userOffice = userOfficeMembership ? offices.find((o) => o.id === userOfficeMembership.officeId) : null;

      let groupKey = 'Other';
      if (userDirectorate) {
        groupKey = userDirectorate.name;
      } else if (userDivision) {
        groupKey = userDivision.name;
      } else if (userOffice) {
        groupKey = userOffice.name;
      }

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(user);
    });

    // Sort groups: current directorate first, then alphabetically
    return Array.from(grouped.entries()).sort((a, b) => {
      if (currentDirectorateName && a[0] === currentDirectorateName) return -1;
      if (currentDirectorateName && b[0] === currentDirectorateName) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredUsers, groupByHierarchy, currentUser, offices, officeMemberships]);

  const displayEmptyMessage = emptyMessage || (searchQuery.trim()
    ? `No users found matching "${searchQuery}"`
    : 'No available recipients');

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="user-selector" className={required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''}>
          {label}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="user-selector"
          aria-label={ariaLabel || label || 'Select user'}
          aria-required={ariaRequired || required}
          aria-invalid={ariaInvalid || !!error}
          aria-describedby={ariaDescribedBy}
          className={error ? 'border-destructive' : ''}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={`bg-popover border-border z-50 max-h-[${maxHeight}] overflow-y-auto`}>
          {/* Search Input */}
          <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Suggested User */}
          {showSuggested && suggestedUser && !searchQuery.trim() && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                {isSuggestedAssistant ? 'Suggested Assistant' : 'Suggested Next'}
              </div>
              <SelectItem value={suggestedUser.id}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-medium">{suggestedUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestedUser.systemRole} • {suggestedUser.gradeLevel}
                    </p>
                    {(() => {
                      const nextDivision = suggestedUser.division ? getDivisionById(suggestedUser.division) : null;
                      const nextDirectorateId = nextDivision?.directorateId ?? suggestedUser.directorate ?? null;
                      const nextDirectorate = nextDirectorateId ? getDirectorateById(nextDirectorateId) : null;
                      const nextOfficeMembership = officeMemberships.find(
                        (m) => m.userId === suggestedUser.id && m.isPrimary && m.isActive
                      );
                      const nextOffice = nextOfficeMembership ? offices.find((o) => o.id === nextOfficeMembership.officeId) : null;

                      if (nextOffice || nextDivision || nextDirectorate) {
                        return (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {nextOffice?.name || ''}
                            {nextOffice && (nextDivision || nextDirectorate) ? ' • ' : ''}
                            {nextDivision?.name || ''}
                            {nextDivision && nextDirectorate ? ' • ' : ''}
                            {nextDirectorate?.name || ''}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </SelectItem>
              <Separator className="my-1" />
            </>
          )}

          {/* User List */}
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {displayEmptyMessage}
            </div>
          ) : groupedUsers && !searchQuery.trim() ? (
            // Grouped view
            groupedUsers.map(([groupName, groupUsers]) => (
              <div key={groupName}>
                <div className="px-2 py-1.5 text-xs font-semibold text-primary sticky top-[41px] bg-popover">
                  {groupName} ({groupUsers.length})
                </div>
                {groupUsers.slice(0, 30).map((user) => {
                  const userDivision = user.division ? getDivisionById(user.division) : null;
                  const userDirectorateId = userDivision?.directorateId ?? user.directorate ?? null;
                  const userDirectorate = userDirectorateId ? getDirectorateById(userDirectorateId) : null;
                  const userOfficeMembership = officeMemberships.find(
                    (m) => m.userId === user.id && m.isPrimary && m.isActive
                  );
                  const userOffice = userOfficeMembership ? offices.find((o) => o.id === userOfficeMembership.officeId) : null;

                  return (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.systemRole} • {user.gradeLevel}
                        </span>
                        {userOffice && (
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            {userOffice.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
                <Separator className="my-1" />
              </div>
            ))
          ) : (
            // Flat list
            <>
              {!showSuggested && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {searchQuery.trim() ? 'Search Results' : 'Available Recipients'} ({filteredUsers.length})
                </div>
              )}
              {filteredUsers.slice(0, 50).map((user) => {
                const userDivision = user.division ? getDivisionById(user.division) : null;
                const userDirectorateId = userDivision?.directorateId ?? user.directorate ?? null;
                const userDirectorate = userDirectorateId ? getDirectorateById(userDirectorateId) : null;
                const userOfficeMembership = officeMemberships.find(
                  (m) => m.userId === user.id && m.isPrimary && m.isActive
                );
                const userOffice = userOfficeMembership ? offices.find((o) => o.id === userOfficeMembership.officeId) : null;

                return (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.systemRole} • {user.gradeLevel}
                      </span>
                      {(userOffice || userDivision || userDirectorate) && (
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {userOffice?.name || ''}
                          {userOffice && (userDivision || userDirectorate) ? ' • ' : ''}
                          {userDivision?.name || ''}
                          {userDivision && userDirectorate ? ' • ' : ''}
                          {userDirectorate?.name || ''}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </>
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive" role="alert" id={ariaDescribedBy}>
          {error}
        </p>
      )}
      {value && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <UserIcon className="h-3 w-3" />
          Selected: {users.find((u) => u.id === value)?.name || 'Unknown'}
        </p>
      )}
    </div>
  );
};

