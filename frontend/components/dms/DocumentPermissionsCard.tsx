"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Building2, FolderTree, GraduationCap, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';

interface PermissionSummary {
  key: string;
  access: string;
  userNames: string[];
  divisionNames: string[];
  departmentNames: string[];
  gradeLevels: string[];
  createdAt?: string;
}

interface DocumentPermissionsCardProps {
  permissionSummaries: PermissionSummary[];
  onManageAccess: () => void;
}

const getAccessBadgeVariant = (access: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (access.toLowerCase()) {
    case 'read':
      return 'default';
    case 'write':
    case 'edit':
      return 'secondary';
    case 'admin':
    case 'delete':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getAccessBadgeColor = (access: string): string => {
  switch (access.toLowerCase()) {
    case 'read':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400';
    case 'write':
    case 'edit':
      return 'bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400';
    case 'admin':
    case 'delete':
      return 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400';
    default:
      return '';
  }
};

export const DocumentPermissionsCard = ({
  permissionSummaries,
  onManageAccess,
}: DocumentPermissionsCardProps) => {
  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedPermissions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedPermissions(newExpanded);
  };

  // Calculate summary totals
  const totalUsers = permissionSummaries.reduce((sum, p) => sum + p.userNames.length, 0);
  const totalDivisions = permissionSummaries.reduce((sum, p) => sum + p.divisionNames.length, 0);
  const totalDepartments = permissionSummaries.reduce((sum, p) => sum + p.departmentNames.length, 0);
  const totalGradeLevels = permissionSummaries.reduce((sum, p) => sum + p.gradeLevels.length, 0);

  const renderList = (items: string[], maxVisible: number = 3) => {
    if (items.length === 0) return <span className="text-muted-foreground">—</span>;
    if (items.length <= maxVisible) {
      return <span>{items.join(', ')}</span>;
    }
    return (
      <span>
        {items.slice(0, maxVisible).join(', ')}
        <span className="text-muted-foreground"> and {items.length - maxVisible} more</span>
      </span>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Access & Permissions
            </CardTitle>
            <CardDescription className="mt-1">
              Track who currently has visibility into this record
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onManageAccess}
            aria-label="Manage document access"
            className="gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {permissionSummaries.length === 0 ? (
            <div className="py-6 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                No explicit share rules exist yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the Share button to grant targeted access.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{totalUsers}</span> users
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{totalDivisions}</span> divisions
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderTree className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{totalDepartments}</span> departments
                </div>
                {totalGradeLevels > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{totalGradeLevels}</span> grade levels
                  </div>
                )}
              </div>

              {/* Permission Rules */}
              <div className="space-y-3">
                {permissionSummaries.map((entry) => {
                  const isExpanded = expandedPermissions.has(entry.key);
                  const hasDetails = entry.userNames.length > 0 || entry.divisionNames.length > 0 || 
                                    entry.departmentNames.length > 0 || entry.gradeLevels.length > 0;

                  return (
                    <div
                      key={entry.key}
                      className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getAccessBadgeVariant(entry.access)}
                              className={`capitalize ${getAccessBadgeColor(entry.access)}`}
                            >
                              {entry.access} access
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {entry.createdAt
                                ? `Updated ${formatDateTime(entry.createdAt)}`
                                : 'Inherited rule'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {entry.userNames.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {entry.userNames.length}
                              </span>
                            )}
                            {entry.divisionNames.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {entry.divisionNames.length}
                              </span>
                            )}
                            {entry.departmentNames.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FolderTree className="h-3 w-3" />
                                {entry.departmentNames.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Summary */}
                        {hasDetails && (
                          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                            {renderList(entry.userNames, 2)}
                          </div>
                        )}
                      </div>

                      {/* Expandable Details */}
                      {hasDetails && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(entry.key)}
                            className="w-full h-8 text-xs border-t border-border/50 rounded-none"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                Show details
                              </>
                            )}
                          </Button>
                          {isExpanded && (
                            <div className="p-4 pt-2 space-y-3 bg-background/50 border-t border-border/50">
                              <div className="grid gap-3 text-xs md:grid-cols-2">
                                {entry.userNames.length > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                      <Users className="h-3.5 w-3.5" />
                                      Users ({entry.userNames.length})
                                    </p>
                                    <p className="text-muted-foreground">{entry.userNames.join(', ')}</p>
                                  </div>
                                )}
                                {entry.divisionNames.length > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                      <Building2 className="h-3.5 w-3.5" />
                                      Divisions ({entry.divisionNames.length})
                                    </p>
                                    <p className="text-muted-foreground">{entry.divisionNames.join(', ')}</p>
                                  </div>
                                )}
                                {entry.departmentNames.length > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                      <FolderTree className="h-3.5 w-3.5" />
                                      Departments ({entry.departmentNames.length})
                                    </p>
                                    <p className="text-muted-foreground">{entry.departmentNames.join(', ')}</p>
                                  </div>
                                )}
                                {entry.gradeLevels.length > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                      <GraduationCap className="h-3.5 w-3.5" />
                                      Grade Levels ({entry.gradeLevels.length})
                                    </p>
                                    <p className="text-muted-foreground">{entry.gradeLevels.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


