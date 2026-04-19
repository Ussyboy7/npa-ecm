"use client";

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OrgNode {
  id: string;
  name: string;
  code: string;
  type: 'directorate' | 'division' | 'department';
  leader?: {
    id: string;
    name: string;
    role: string;
  };
  children?: OrgNode[];
  userCount?: number;
}

interface OrgDirectorate {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  executiveDirectorId?: string;
}

interface OrgDivision {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  directorateId: string;
  generalManagerId?: string;
}

interface OrgDepartment {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  divisionId: string;
  headOfDepartmentId?: string;
}

interface OrgUser {
  id: string;
  name: string;
  directorate?: string;
  division?: string;
  department?: string;
}

interface OrganizationChartProps {
  directorates: OrgDirectorate[];
  divisions: OrgDivision[];
  departments: OrgDepartment[];
  users: OrgUser[];
}

export function OrganizationChart({
  directorates,
  divisions,
  departments,
  users,
}: OrganizationChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const orgTree = useMemo(() => {
    // Build tree structure
    const tree: OrgNode[] = directorates
      .filter((d) => d.isActive)
      .map((dir) => {
        const dirDivisions = divisions
          .filter((div) => div.isActive && div.directorateId === dir.id)
          .map((div) => {
            const divDepartments = departments
              .filter((dept) => dept.isActive && dept.divisionId === div.id)
              .map(dept => ({
                id: dept.id,
                name: dept.name,
                code: dept.code,
                type: 'department' as const,
                leader: dept.headOfDepartmentId ? {
                  id: dept.headOfDepartmentId,
                  name: users.find((u) => u.id === dept.headOfDepartmentId)?.name || 'Unknown',
                  role: 'Head of Department',
                } : undefined,
                userCount: users.filter((u) => u.department === dept.id).length,
              }));

            return {
              id: div.id,
              name: div.name,
              code: div.code,
              type: 'division' as const,
              leader: div.generalManagerId ? {
                id: div.generalManagerId,
                name: users.find((u) => u.id === div.generalManagerId)?.name || 'Unknown',
                role: 'General Manager',
              } : undefined,
              children: divDepartments,
              userCount: users.filter((u) => u.division === div.id).length,
            };
          });

        return {
          id: dir.id,
          name: dir.name,
          code: dir.code,
          type: 'directorate' as const,
          leader: dir.executiveDirectorId ? {
            id: dir.executiveDirectorId,
            name: users.find((u) => u.id === dir.executiveDirectorId)?.name || 'Unknown',
            role: 'Executive Director',
          } : undefined,
          children: dirDivisions,
          userCount: users.filter((u) => u.directorate === dir.id).length,
        };
      });

    return tree;
  }, [directorates, divisions, departments, users]);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: OrgNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    collectIds(orgTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: OrgNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const bgColors = {
      directorate: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      division: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      department: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    };

    const iconColors = {
      directorate: 'text-blue-600 dark:text-blue-400',
      division: 'text-green-600 dark:text-green-400',
      department: 'text-purple-600 dark:text-purple-400',
    };

    return (
      <div key={node.id} className="relative">
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
            bgColors[node.type],
            'hover:shadow-md cursor-pointer'
          )}
          style={{ marginLeft: `${level * 2}rem` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <Building2 className={cn('h-5 w-5', iconColors[node.type])} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{node.name}</h3>
              <Badge variant="outline" className="text-xs">
                {node.code}
              </Badge>
            </div>
            
            {node.leader && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{node.leader.name}</span>
                <span className="text-xs">({node.leader.role})</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{node.userCount || 0}</span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={expandAll} variant="outline" size="sm">
          Expand All
        </Button>
        <Button onClick={collapseAll} variant="outline" size="sm">
          Collapse All
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {orgTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No organization structure found
            </div>
          ) : (
            <div className="space-y-3">
              {orgTree.map(node => renderNode(node))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

