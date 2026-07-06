"use client";
import { Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { highlightText } from "@/lib/search-highlight";
import type { User } from "@/lib/npa-structure";

interface UserButtonProps {
  user: User;
  searchQuery?: string;
  isFavorite?: boolean;
  showFavorite?: boolean;
  onToggleFavorite?: (userId: string, e: React.MouseEvent) => void;
  onClick: (user: User) => void;
  disabled?: boolean;
  divisionName?: string;
  departmentName?: string;
  directorateName?: string;
}

export const UserButton = ({
  user,
  searchQuery,
  isFavorite,
  showFavorite = true,
  onToggleFavorite,
  onClick,
  disabled,
  divisionName,
  departmentName,
  directorateName,
}: UserButtonProps) => {
  const userInfo = `${user.email || ""}${user.employeeId ? ` \u2022 ID: ${user.employeeId}` : ""}${user.gradeLevel ? ` \u2022 ${user.gradeLevel}` : ""}`;

  return (
    <div className="relative group">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-2 px-3 overflow-hidden"
            onClick={() => onClick(user)}
            disabled={disabled}
            aria-label={`Switch to ${user.name || user.username}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(user);
              }
            }}
          >
            <div className="flex items-center gap-3 w-full min-w-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                {user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "U"}
              </div>
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <div className="text-sm font-medium">
                  {searchQuery ? highlightText(user.name || user.username || "", searchQuery) : (user.name || user.username)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {searchQuery && user.systemRole ? (
                    highlightText(user.systemRole, searchQuery)
                  ) : (
                    user.systemRole || user.gradeLevel
                  )}
                  {departmentName ? ` \u2022 ${departmentName}` : divisionName ? ` \u2022 ${divisionName}` : directorateName ? ` \u2022 ${directorateName}` : ""}
                </div>
              </div>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-medium">{user.name || user.username}</div>
            {userInfo && <div className="text-muted-foreground">{userInfo}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
      {showFavorite && onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => onToggleFavorite(user.id, e)}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          tabIndex={0}
        >
          {isFavorite ? (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
};
