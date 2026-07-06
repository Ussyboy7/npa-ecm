"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserButton } from "./UserButton";
import type { User } from "@/lib/npa-structure";

const USERS_PER_GROUP = 25;

interface UserGroupProps {
  title: string;
  groupKey: string;
  users: User[];
  collapsedGroups: Set<string>;
  expandedGroups: Set<string>;
  onToggleCollapse: (key: string) => void;
  onToggleExpand: (key: string) => void;
  searchQuery?: string;
  favorites: Set<string>;
  onToggleFavorite: (userId: string, e: React.MouseEvent) => void;
  isSwitching: boolean;
  onImpersonateClick: (user: User) => void;
  divisionMap: Map<string, { id: string; name: string }>;
  departmentMap: Map<string, { id: string; name: string; divisionId?: string }>;
  getDirectorateNameForUser: (user: User) => string | undefined;
}

export const UserGroup = ({
  title,
  groupKey,
  users,
  collapsedGroups,
  expandedGroups,
  onToggleCollapse,
  onToggleExpand,
  searchQuery,
  favorites,
  onToggleFavorite,
  isSwitching,
  onImpersonateClick,
  divisionMap,
  departmentMap,
  getDirectorateNameForUser,
}: UserGroupProps) => {
  if (users.length === 0) return null;

  const isCollapsed = collapsedGroups.has(groupKey);
  const isExpanded = expandedGroups.has(groupKey);
  const displayCount = isExpanded ? users.length : USERS_PER_GROUP;
  const hasMore = users.length > USERS_PER_GROUP;

  return (
    <div className="mb-4" role="group" aria-labelledby={`group-${groupKey}`}>
      <button
        type="button"
        onClick={() => onToggleCollapse(groupKey)}
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`group-content-${groupKey}`}
        id={`group-${groupKey}`}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {title}
        </div>
        <Badge variant="secondary" className="text-[10px]">{users.length}</Badge>
      </button>
      {!isCollapsed && (
        <div id={`group-content-${groupKey}`} className="space-y-1" role="list">
          {users.slice(0, displayCount).map((user) => (
            <div key={user.id} role="listitem">
              <UserButton
                user={user}
                searchQuery={searchQuery}
                isFavorite={favorites.has(user.id)}
                onToggleFavorite={onToggleFavorite}
                onClick={onImpersonateClick}
                disabled={isSwitching}
                divisionName={user.division ? divisionMap.get(user.division)?.name : undefined}
                departmentName={user.department ? departmentMap.get(user.department)?.name : undefined}
                directorateName={getDirectorateNameForUser(user)}
              />
            </div>
          ))}
          {hasMore && !isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onToggleExpand(groupKey)}
              aria-label={`Show all ${users.length} users in ${title}`}
            >
              Show all {users.length} users
            </Button>
          )}
          {isExpanded && hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onToggleExpand(groupKey)}
              aria-label={`Show first ${USERS_PER_GROUP} users in ${title}`}
            >
              Show less
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
