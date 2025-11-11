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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization, type Directorate } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DirectorateLeadershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directorate: Directorate | null;
}

export const DirectorateLeadershipDialog = ({
  open,
  onOpenChange,
  directorate,
}: DirectorateLeadershipDialogProps) => {
  const { users, updateDirectorate } = useOrganization();
  const [selectedLeader, setSelectedLeader] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (directorate) {
      setSelectedLeader(directorate.executiveDirectorId ?? "");
    } else {
      setSelectedLeader("");
    }
  }, [directorate, open]);

  const leaderCandidates = useMemo(() => {
    if (!directorate) return [];
    const allowedGrades =
      directorate.id === "dir-md" ? ["MDCS"] : ["EDCS"];
    return users
      .filter(
        (user) =>
          allowedGrades.includes(user.gradeLevel) ||
          (directorate.id !== "dir-md" && user.gradeLevel === "MDCS")
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [directorate, users]);

  const selectedUser = selectedLeader
    ? users.find((user) => user.id === selectedLeader)
    : undefined;

  const handleSave = async () => {
    if (!directorate || isSaving) return;

    setIsSaving(true);
    try {
      await updateDirectorate(directorate.id, {
        executiveDirectorId: selectedLeader || null,
      });

      const message = selectedLeader
        ? `Assigned ${selectedUser?.name ?? "selected leader"} as head of ${directorate.name}.`
        : `Cleared executive assignment for ${directorate.name}.`;

      toast({
        title: "Leadership updated",
        description: message,
      });

      onOpenChange(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to update directorate leadership.";
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Directorate Leader</DialogTitle>
          <DialogDescription>
            {directorate
              ? `Select the executive responsible for ${directorate.name}.`
              : "Select a directorate to continue."}
          </DialogDescription>
        </DialogHeader>

        {directorate && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="directorate-leader">Executive Director / Managing Director</Label>
              <Select
                value={selectedLeader || "__none"}
                onValueChange={(value) => setSelectedLeader(value === "__none" ? "" : value)}
              >
                <SelectTrigger id="directorate-leader">
                  <SelectValue placeholder="Select a leader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No assigned leader</SelectItem>
                  {leaderCandidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} • {candidate.systemRole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">
                Current Assignment
              </p>
              {selectedLeader && selectedUser ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{selectedUser.name}</span>
                    <Badge variant="outline">{selectedUser.systemRole}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No leader assigned. Assign an executive director.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!directorate || isSaving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

