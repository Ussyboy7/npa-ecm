"use client";

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  User as UserIcon,
  Building2,
  FileText,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import type { User } from '@/lib/npa-structure';

interface RoutingSectionProps {
  // Route type (person or office)
  routeType: 'person' | 'office';
  onRouteTypeChange: (type: 'person' | 'office') => void;
  
  // Person routing
  forwardTo: string;
  onForwardToChange: (userId: string) => void;
  forwardToError?: string;
  personSearchQuery: string;
  onPersonSearchQueryChange: (query: string) => void;
  
  // Office routing
  targetOfficeId: string;
  onTargetOfficeIdChange: (officeId: string) => void;
  officeSearchQuery: string;
  onOfficeSearchQueryChange: (query: string) => void;
  officeFilterDirectorate: string;
  onOfficeFilterDirectorateChange: (directorateId: string) => void;
  officeFilterDivision: string;
  onOfficeFilterDivisionChange: (divisionId: string) => void;
  
  // Purpose
  purpose: 'action' | 'information' | 'comment' | 'approval';
  onPurposeChange: (purpose: 'action' | 'information' | 'comment' | 'approval') => void;
  
  // Data
  offices: Array<{ id: string; name: string; officeType?: string; directorateId?: string; divisionId?: string }>;
  directorates: Array<{ id: string; name: string; shortName?: string }>;
  divisions: Array<{ id: string; name: string; shortName?: string; directorateId?: string }>;
  users: User[];
  assistantList: User[];
  approverList: User[];
  suggestedNext?: User;
  
  // Helpers
  findUserById: (id: string) => User | undefined;
  getUserOfficeInfo: (userId: string) => { office?: { name: string }; division?: { name: string } } | null;
}

export const RoutingSection = ({
  routeType,
  onRouteTypeChange,
  forwardTo,
  onForwardToChange,
  forwardToError,
  personSearchQuery,
  onPersonSearchQueryChange,
  targetOfficeId,
  onTargetOfficeIdChange,
  officeSearchQuery,
  onOfficeSearchQueryChange,
  officeFilterDirectorate,
  onOfficeFilterDirectorateChange,
  officeFilterDivision,
  onOfficeFilterDivisionChange,
  purpose,
  onPurposeChange,
  offices,
  directorates,
  divisions,
  assistantList,
  approverList,
  suggestedNext,
  findUserById,
  getUserOfficeInfo,
}: RoutingSectionProps) => {
  // Filtered divisions based on selected directorate
  const filteredOfficeDivisions = useMemo(() => {
    if (officeFilterDirectorate === 'all') return divisions;
    return divisions.filter(d => d.directorateId === officeFilterDirectorate);
  }, [divisions, officeFilterDirectorate]);

  // Filtered offices based on filters
  const filteredOfficeOptions = useMemo(() => {
    let result = [...offices];

    if (officeFilterDirectorate !== 'all') {
      result = result.filter(o => o.directorateId === officeFilterDirectorate);
    }

    if (officeFilterDivision !== 'all') {
      result = result.filter(o => o.divisionId === officeFilterDivision);
    }

    if (officeSearchQuery.trim()) {
      const query = officeSearchQuery.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.officeType?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [offices, officeFilterDirectorate, officeFilterDivision, officeSearchQuery]);

  // Filtered users for person search
  const filteredUsers = useMemo(() => {
    if (!personSearchQuery.trim()) return approverList;
    const query = personSearchQuery.toLowerCase();
    return approverList.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.systemRole?.toLowerCase().includes(query) ||
      user.gradeLevel?.toLowerCase().includes(query)
    );
  }, [approverList, personSearchQuery]);

  const recipientUser = forwardTo ? findUserById(forwardTo) : undefined;
  const recipientInfo = forwardTo ? getUserOfficeInfo(forwardTo) : null;
  const selectedOffice = targetOfficeId ? offices.find(o => o.id === targetOfficeId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Route To *</Label>
          <Badge variant={(forwardTo || targetOfficeId) ? 'default' : 'outline'} className="text-xs">
            {forwardTo ? '1 person' : targetOfficeId ? '1 office' : '0 recipients'}
          </Badge>
        </div>
        {forwardToError && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {forwardToError}
          </span>
        )}
      </div>

      {/* Selection Form - Grid Layout */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Route Type Column */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Route Type</Label>
            <Select
              value={routeType}
              onValueChange={(v: 'person' | 'office') => {
                onRouteTypeChange(v);
                if (v === 'office') {
                  onForwardToChange('');
                  onPersonSearchQueryChange('');
                } else {
                  onTargetOfficeIdChange('');
                  onOfficeSearchQueryChange('');
                  onOfficeFilterDirectorateChange('all');
                  onOfficeFilterDivisionChange('all');
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Person
                  </div>
                </SelectItem>
                <SelectItem value="office">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Office
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Person or Office Column */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              {routeType === 'office' ? (
                <><Building2 className="h-3 w-3" /> Office</>
              ) : (
                <><UserIcon className="h-3 w-3" /> Person</>
              )}
            </Label>
            {routeType === 'office' ? (
              <div className="space-y-2">
                {/* Filter Row */}
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={officeFilterDirectorate}
                    onValueChange={(v) => {
                      onOfficeFilterDirectorateChange(v);
                      onOfficeFilterDivisionChange('all');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Directorate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directorates</SelectItem>
                      {directorates.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={officeFilterDivision}
                    onValueChange={onOfficeFilterDivisionChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {filteredOfficeDivisions.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Office Dropdown */}
                <Select
                  value={targetOfficeId}
                  onValueChange={(v) => {
                    onTargetOfficeIdChange(v);
                    onForwardToChange('');
                  }}
                >
                  <SelectTrigger className={`h-9 ${forwardToError ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredOfficeOptions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No offices found
                      </div>
                    ) : (
                      filteredOfficeOptions.map(office => (
                        <SelectItem key={office.id} value={office.id}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>{office.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {office.officeType}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {(officeFilterDirectorate !== 'all' || officeFilterDivision !== 'all') && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredOfficeOptions.length} of {offices.length} offices
                  </p>
                )}
              </div>
            ) : (
              <Select
                value={forwardTo}
                onValueChange={(v) => {
                  onForwardToChange(v);
                }}
              >
                <SelectTrigger className={`h-9 ${forwardToError ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                  {/* Search Input */}
                  <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, role..."
                        value={personSearchQuery}
                        onChange={(e) => onPersonSearchQueryChange(e.target.value)}
                        className="pl-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {assistantList.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                        Assistants ({assistantList.length})
                      </div>
                      {assistantList.map((user) => {
                        const userInfo = getUserOfficeInfo(user.id);
                        return (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.systemRole}
                                {userInfo?.office && ` • ${userInfo.office.name}`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                      <Separator className="my-1" />
                    </>
                  )}

                  {suggestedNext && !personSearchQuery.trim() && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-success">
                        Suggested Next
                      </div>
                      <SelectItem value={suggestedNext.id}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-success shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">{suggestedNext.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {suggestedNext.systemRole} • {suggestedNext.gradeLevel}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <Separator className="my-1" />
                    </>
                  )}

                  {filteredUsers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        All Recipients ({filteredUsers.length})
                      </div>
                      {filteredUsers.slice(0, 30).map(user => {
                        const userInfo = getUserOfficeInfo(user.id);
                        return (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.systemRole}
                                {userInfo?.division && ` • ${userInfo.division.name}`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </>
                  )}

                  {filteredUsers.length === 0 && assistantList.length === 0 && !suggestedNext && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No recipients available
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Purpose Column */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Purpose
            </Label>
            <Select value={purpose} onValueChange={(v: string) => onPurposeChange(v as typeof purpose)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-warning" />
                    For Action
                  </div>
                </SelectItem>
                <SelectItem value="information">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-info" />
                    For Information
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-success" />
                    For Comment
                  </div>
                </SelectItem>
                <SelectItem value="approval">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    For Approval
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selected Recipient Card - Person */}
      {forwardTo && recipientUser && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Selected Recipient
          </Label>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{recipientUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {recipientUser.systemRole} • {recipientUser.gradeLevel}
                    </p>
                    {recipientInfo && (
                      <p className="text-xs text-muted-foreground truncate">
                        {recipientInfo.office?.name}
                        {recipientInfo.division && ` • ${recipientInfo.division.name}`}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs gap-1 shrink-0 ${
                      purpose === 'information' ? 'bg-info/10 text-info border-info/20' :
                      purpose === 'action' ? 'bg-warning/10 text-warning border-warning/20' :
                      purpose === 'comment' ? 'bg-success/10 text-success border-success/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    {purpose === 'information' ? <FileText className="h-3 w-3" /> :
                     purpose === 'action' ? <CheckCircle className="h-3 w-3" /> :
                     purpose === 'comment' ? <MessageSquare className="h-3 w-3" /> :
                     <CheckCircle className="h-3 w-3" />}
                    {purpose === 'information' ? 'Info' :
                     purpose === 'action' ? 'Action' :
                     purpose === 'comment' ? 'Comment' : 'Approval'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-2 text-muted-foreground hover:text-destructive"
                  onClick={() => onForwardToChange('')}
                  aria-label="Remove recipient"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Recipient Card - Office */}
      {!forwardTo && targetOfficeId && selectedOffice && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Selected Office
          </Label>
          <Card className="border-secondary/30 bg-secondary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedOffice.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {selectedOffice.officeType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Will be routed to office inbox
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Office
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-2 text-muted-foreground hover:text-destructive"
                  onClick={() => onTargetOfficeIdChange('')}
                  aria-label="Remove office"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

