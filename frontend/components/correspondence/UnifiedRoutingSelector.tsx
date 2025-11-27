"use client";

/**
 * UnifiedRoutingSelector - Combines office and person routing into one component
 * Style matches DistributionSelector
 */

import { useMemo, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  User as UserIcon, 
  Search, 
  X, 
  Check,
  ChevronRight,
  Mail
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Office, User } from '@/lib/npa-structure';
import { cn } from '@/lib/utils';

interface UnifiedRoutingSelectorProps {
  // Current values
  selectedOfficeId: string;
  selectedUserId: string;
  // Callbacks
  onOfficeChange: (officeId: string) => void;
  onUserChange: (userId: string) => void;
  // Available options
  offices: Office[];
  users: User[];
  // Display options
  currentOfficeName?: string;
  currentUserName?: string;
  excludeUserId?: string; // Exclude current user
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export const UnifiedRoutingSelector = ({
  selectedOfficeId,
  selectedUserId,
  onOfficeChange,
  onUserChange,
  offices,
  users,
  currentOfficeName,
  currentUserName,
  excludeUserId,
  label = "Route To",
  required = false,
  error,
  disabled = false,
}: UnifiedRoutingSelectorProps) => {
  const { directorates, divisions, departments, officeMemberships } = useOrganization();
  
  // State
  const [activeTab, setActiveTab] = useState<'office' | 'person'>(selectedUserId ? 'person' : 'office');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // Get filtered divisions based on directorate
  const filteredDivisions = useMemo(() => {
    if (filterDirectorate === 'all') return divisions;
    return divisions.filter(d => d.directorateId === filterDirectorate);
  }, [divisions, filterDirectorate]);

  // Filter offices
  const filteredOffices = useMemo(() => {
    let result = [...offices];

    if (filterDirectorate !== 'all') {
      result = result.filter(o => o.directorateId === filterDirectorate);
    }

    if (filterDivision !== 'all') {
      result = result.filter(o => o.divisionId === filterDivision);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.code?.toLowerCase().includes(query) ||
        o.officeType?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, filterDirectorate, filterDivision, searchQuery]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let result = users.filter(u => u.id !== excludeUserId && u.active);

    if (filterDirectorate !== 'all') {
      result = result.filter(u => u.directorate === filterDirectorate);
    }

    if (filterDivision !== 'all') {
      result = result.filter(u => u.division === filterDivision);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.systemRole?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, excludeUserId, filterDirectorate, filterDivision, searchQuery]);

  // Get user's primary office
  const getUserOffice = useCallback((userId: string): Office | undefined => {
    const membership = officeMemberships.find(m => m.userId === userId && m.isPrimary && m.isActive);
    if (!membership) return undefined;
    return offices.find(o => o.id === membership.officeId);
  }, [officeMemberships, offices]);

  // Handle office selection
  const handleOfficeSelect = (officeId: string) => {
    onOfficeChange(officeId);
    onUserChange(''); // Clear user when selecting office
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    onUserChange(userId);
    // Auto-set office based on user's primary office
    const userOffice = getUserOffice(userId);
    if (userOffice) {
      onOfficeChange(userOffice.id);
    }
  };

  // Clear selection
  const handleClear = () => {
    onOfficeChange('');
    onUserChange('');
    setSearchQuery('');
  };

  // Reset filters when directorate changes
  const handleDirectorateChange = (val: string) => {
    setFilterDirectorate(val);
    setFilterDivision('all');
  };

  // Get display info
  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const selectedUser = users.find(u => u.id === selectedUserId);
  const hasSelection = selectedOfficeId || selectedUserId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
          {label}
        </Label>
        {hasSelection && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Selected Display */}
      {hasSelection && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {selectedUser ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.systemRole}
                      {selectedOffice && ` • ${selectedOffice.name}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Person</Badge>
                </>
              ) : selectedOffice ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{selectedOffice.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{selectedOffice.officeType}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">Office</Badge>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Interface */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'office' | 'person')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="office" className="gap-2">
                <Building2 className="h-4 w-4" />
                Office
              </TabsTrigger>
              <TabsTrigger value="person" className="gap-2">
                <UserIcon className="h-4 w-4" />
                Person
              </TabsTrigger>
            </TabsList>

            {/* Search & Filters */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={activeTab === 'office' ? 'Search offices...' : 'Search people...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={filterDirectorate} onValueChange={handleDirectorateChange} disabled={disabled}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Directorate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Directorates</SelectItem>
                    {directorates.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.shortName || d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterDivision} onValueChange={setFilterDivision} disabled={disabled}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {filteredDivisions.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.shortName || d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Office List */}
            <TabsContent value="office" className="mt-3">
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {/* Keep Current Option */}
                  {currentOfficeName && (
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted",
                        !selectedOfficeId && "bg-muted"
                      )}
                      onClick={() => handleOfficeSelect('')}
                    >
                      <Check className={cn("h-4 w-4", !selectedOfficeId ? "opacity-100" : "opacity-0")} />
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Keep current ({currentOfficeName})</span>
                    </div>
                  )}

                  {filteredOffices.length === 0 ? (
                    <p className="text-center py-6 text-sm text-muted-foreground">No offices found</p>
                  ) : (
                    filteredOffices.map(office => (
                      <div
                        key={office.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted",
                          selectedOfficeId === office.id && "bg-muted"
                        )}
                        onClick={() => handleOfficeSelect(office.id)}
                      >
                        <Check className={cn("h-4 w-4", selectedOfficeId === office.id ? "opacity-100" : "opacity-0")} />
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{office.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{office.officeType}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {filteredOffices.length} of {offices.length} offices
              </p>
            </TabsContent>

            {/* Person List */}
            <TabsContent value="person" className="mt-3">
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center py-6 text-sm text-muted-foreground">No people found</p>
                  ) : (
                    filteredUsers.map(user => {
                      const userOffice = getUserOffice(user.id);
                      const userDivision = divisions.find(d => d.id === user.division);
                      return (
                        <div
                          key={user.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted",
                            selectedUserId === user.id && "bg-muted"
                          )}
                          onClick={() => handleUserSelect(user.id)}
                        >
                          <Check className={cn("h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.systemRole}
                              {userDivision && ` • ${userDivision.shortName || userDivision.name}`}
                            </p>
                          </div>
                          {userOffice && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {userOffice.officeType}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {filteredUsers.length} of {users.filter(u => u.id !== excludeUserId && u.active).length} people
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

