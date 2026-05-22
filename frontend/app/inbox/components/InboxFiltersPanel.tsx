"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

interface InboxFiltersPanelProps {
  selectedStatuses: string[];
  selectedPriorities: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  activeFilterCount: number;
  onToggleStatus: (status: string) => void;
  onTogglePriority: (priority: string) => void;
  onSortChange: (value: string) => void;
  onClearAll: () => void;
}

const STATUS_OPTIONS = ['pending', 'in-progress', 'completed'];
const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low'];
const SORT_OPTIONS = [
  { value: 'priority-desc', label: 'Priority (Urgent First)' },
  { value: 'days_pending-desc', label: 'Days Pending (Oldest)' },
  { value: 'updated-desc', label: 'Last Updated (Newest)' },
  { value: 'updated-asc', label: 'Last Updated (Oldest)' },
  { value: 'reference-asc', label: 'Reference (A-Z)' },
];

export const InboxFiltersPanel = ({
  selectedStatuses,
  selectedPriorities,
  sortBy,
  sortOrder,
  activeFilterCount,
  onToggleStatus,
  onTogglePriority,
  onSortChange,
  onClearAll,
}: InboxFiltersPanelProps) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">My Inbox Filters</CardTitle>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear All
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Status</Label>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((status) => (
              <Badge
                key={status}
                variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer capitalize text-xs"
                onClick={() => onToggleStatus(status)}
              >
                {status.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Priority</Label>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map((priority) => (
              <Badge
                key={priority}
                variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                className="cursor-pointer capitalize text-xs"
                onClick={() => onTogglePriority(priority)}
                style={
                  selectedPriorities.includes(priority)
                    ? { backgroundColor: PRIORITY_COLORS[priority] }
                    : {}
                }
              >
                {priority}
              </Badge>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label className="text-sm font-medium mb-2 block">Sort By</Label>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={onSortChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
);
