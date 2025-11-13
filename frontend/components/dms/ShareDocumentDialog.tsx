"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DocumentRecord } from "@/lib/dms-storage";
import { shareDocument } from "@/lib/dms-storage";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, Users, Building2, Users2, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  currentUserId?: string;
  onShared?: (updated?: DocumentRecord) => void;
}

export const ShareDocumentDialog = ({
  open,
  onOpenChange,
  document,
  currentUserId,
  onShared,
}: ShareDocumentDialogProps) => {
  const { users, directorates, divisions, departments } = useOrganization();
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Selection state
  const [shareToAll, setShareToAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedDirectorateIds, setSelectedDirectorateIds] = useState<Set<string>>(new Set());
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Set<string>>(new Set());
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setNote("");
      setSearchQuery("");
      setShareToAll(false);
      setSelectedUserIds(new Set());
      setSelectedDirectorateIds(new Set());
      setSelectedDivisionIds(new Set());
      setSelectedDepartmentIds(new Set());
      setActiveTab("all");
    }
  }, [open]);

  const shareableUsers = useMemo(
    () =>
      users
        .filter((user) => user.active && (!currentUserId || user.id !== currentUserId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, currentUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return shareableUsers;
    const query = searchQuery.toLowerCase();
    return shareableUsers.filter((user) =>
      [user.name, user.email, user.systemRole]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [shareableUsers, searchQuery]);

  // Group divisions by directorate
  const divisionsByDirectorate = useMemo(() => {
    const map = new Map<string, typeof divisions>();
    directorates.forEach((dir) => {
      const dirDivisions = divisions.filter((div) => div.directorateId === dir.id);
      if (dirDivisions.length > 0) {
        map.set(dir.id, dirDivisions);
      }
    });
    return map;
  }, [directorates, divisions]);

  // Group departments by division
  const departmentsByDivision = useMemo(() => {
    const map = new Map<string, typeof departments>();
    divisions.forEach((div) => {
      const divDepartments = departments.filter((dept) => dept.divisionId === div.id);
      if (divDepartments.length > 0) {
        map.set(div.id, divDepartments);
      }
    });
    return map;
  }, [divisions, departments]);

  // Get all division IDs for selected directorates
  const selectedDivisionIdsFromDirectorates = useMemo(() => {
    const ids = new Set<string>();
    selectedDirectorateIds.forEach((dirId) => {
      const dirDivisions = divisionsByDirectorate.get(dirId) || [];
      dirDivisions.forEach((div) => ids.add(div.id));
    });
    return ids;
  }, [selectedDirectorateIds, divisionsByDirectorate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) return;

    if (shareToAll) {
      // Share to all users
      setIsSubmitting(true);
      try {
        const updated = await shareDocument(document.id, {
          shareToAll: true,
        });
        toast.success("Document shared with all users", {
          description: note ? "Notification coming soon." : undefined,
        });
        onShared?.(updated);
        onOpenChange(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to share document";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Combine division IDs from directorates and directly selected divisions
    const allDivisionIds = Array.from(
      new Set([...selectedDivisionIds, ...selectedDivisionIdsFromDirectorates])
    );

    const hasSelection =
      selectedUserIds.size > 0 || allDivisionIds.length > 0 || selectedDepartmentIds.size > 0;

    if (!hasSelection) {
      toast.error("Select at least one recipient, division, or department");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await shareDocument(document.id, {
        userIds: Array.from(selectedUserIds),
        divisionIds: allDivisionIds,
        departmentIds: Array.from(selectedDepartmentIds),
      });
      toast.success("Document shared", {
        description: note ? "Notification coming soon." : undefined,
      });
      onShared?.(updated);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to share document";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const toggleDirectorate = (dirId: string) => {
    const newSet = new Set(selectedDirectorateIds);
    if (newSet.has(dirId)) {
      newSet.delete(dirId);
    } else {
      newSet.add(dirId);
    }
    setSelectedDirectorateIds(newSet);
  };

  const toggleAllDirectorates = () => {
    if (selectedDirectorateIds.size === directorates.length) {
      setSelectedDirectorateIds(new Set());
    } else {
      setSelectedDirectorateIds(new Set(directorates.map((d) => d.id)));
    }
  };

  const toggleDivision = (divId: string) => {
    const newSet = new Set(selectedDivisionIds);
    if (newSet.has(divId)) {
      newSet.delete(divId);
    } else {
      newSet.add(divId);
    }
    setSelectedDivisionIds(newSet);
  };

  const toggleAllDivisions = () => {
    if (selectedDivisionIds.size === divisions.length) {
      setSelectedDivisionIds(new Set());
    } else {
      setSelectedDivisionIds(new Set(divisions.map((d) => d.id)));
    }
  };

  const toggleDepartment = (deptId: string) => {
    const newSet = new Set(selectedDepartmentIds);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setSelectedDepartmentIds(newSet);
  };

  const toggleAllDepartments = () => {
    if (selectedDepartmentIds.size === departments.length) {
      setSelectedDepartmentIds(new Set());
    } else {
      setSelectedDepartmentIds(new Set(departments.map((d) => d.id)));
    }
  };

  const totalSelected =
    (shareToAll ? 1 : 0) +
    selectedUserIds.size +
    selectedDirectorateIds.size +
    selectedDivisionIds.size +
    selectedDepartmentIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Grant read access to users, divisions, or departments. Shared documents will appear in their My Documents view.
          </DialogDescription>
        </DialogHeader>

        {document && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="rounded-md border bg-muted/20 p-3 space-y-2 flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">{document.title}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {document.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {document.documentType}
                </Badge>
                {document.referenceNumber && <span>Ref: {document.referenceNumber}</span>}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="directorate" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Directorate
                  </TabsTrigger>
                  <TabsTrigger value="division" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Division
                  </TabsTrigger>
                  <TabsTrigger value="department" className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Department
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Users
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <Checkbox
                        id="share-to-all"
                        checked={shareToAll}
                        onCheckedChange={(checked) => setShareToAll(checked === true)}
                      />
                      <Label htmlFor="share-to-all" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="font-medium">Share to all users</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Grant access to all active users in the system
                        </p>
                      </Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="directorate" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-2 border-b">
                      <Label className="text-sm font-medium">
                        Select Directorates ({selectedDirectorateIds.size} selected)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllDirectorates}
                        className="text-xs"
                      >
                        {selectedDirectorateIds.size === directorates.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 p-2">
                        {directorates.map((dir) => {
                          const isSelected = selectedDirectorateIds.has(dir.id);
                          const divisionCount = divisionsByDirectorate.get(dir.id)?.length || 0;
                          return (
                            <div
                              key={dir.id}
                              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`dir-${dir.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleDirectorate(dir.id)}
                              />
                              <Label htmlFor={`dir-${dir.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{dir.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {divisionCount} division{divisionCount !== 1 ? "s" : ""}
                                  </Badge>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="division" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-2 border-b">
                      <Label className="text-sm font-medium">
                        Select Divisions ({selectedDivisionIds.size} selected)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllDivisions}
                        className="text-xs"
                      >
                        {selectedDivisionIds.size === divisions.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 p-2">
                        {divisions.map((div) => {
                          const isSelected = selectedDivisionIds.has(div.id);
                          const directorateName = directorates.find((d) => d.id === div.directorateId)?.name;
                          return (
                            <div
                              key={div.id}
                              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`div-${div.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleDivision(div.id)}
                              />
                              <Label htmlFor={`div-${div.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{div.name}</span>
                                    {directorateName && (
                                      <p className="text-xs text-muted-foreground">{directorateName}</p>
                                    )}
                                  </div>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="department" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-2 border-b">
                      <Label className="text-sm font-medium">
                        Select Departments ({selectedDepartmentIds.size} selected)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllDepartments}
                        className="text-xs"
                      >
                        {selectedDepartmentIds.size === departments.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 p-2">
                        {departments.map((dept) => {
                          const isSelected = selectedDepartmentIds.has(dept.id);
                          const divisionName = divisions.find((d) => d.id === dept.divisionId)?.name;
                          return (
                            <div
                              key={dept.id}
                              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`dept-${dept.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleDepartment(dept.id)}
                              />
                              <Label htmlFor={`dept-${dept.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{dept.name}</span>
                                    {divisionName && (
                                      <p className="text-xs text-muted-foreground">{divisionName}</p>
                                    )}
                                  </div>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-2 border-b">
                      <Label className="text-sm font-medium">
                        Select Users ({selectedUserIds.size} selected)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllUsers}
                        className="text-xs"
                      >
                        {selectedUserIds.size === filteredUsers.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search name, email, role..."
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
                            const isSelected = selectedUserIds.has(user.id);
                            return (
                              <div
                                key={user.id}
                                className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50"
                              >
                                <Checkbox
                                  id={`user-${user.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleUser(user.id)}
                                />
                                <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.email} • {user.systemRole}
                                    </span>
                                  </div>
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No users match your search
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 mt-4 flex-shrink-0 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="share-note">Message (optional)</Label>
                  <Textarea
                    id="share-note"
                    placeholder="Add context or instructions. Notifications will include this message in a future release."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                  />
                </div>

                {totalSelected > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {shareToAll
                      ? "Document will be shared with all users."
                      : `Document will be shared with ${totalSelected} selection${totalSelected !== 1 ? "s" : ""}.`}
                  </p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || (!shareToAll && totalSelected === 0)}
                  >
                    {isSubmitting ? "Sharing…" : "Share Document"}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
