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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DocumentRecord } from "@/lib/dms-storage";
import { shareDocumentWithUsers } from "@/lib/dms-storage";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const EMPTY_USER = "__none";

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
  const { users } = useOrganization();
  const [recipientId, setRecipientId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setRecipientId("");
      setNote("");
      setSearchQuery("");
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) return;
    const target = recipientId || "";
    if (!target) {
      toast.error("Select a recipient");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await shareDocumentWithUsers(document.id, [target]);
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

  const selectedUser = recipientId
    ? shareableUsers.find((user) => user.id === recipientId)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Grant read access to a colleague. Shared documents will appear in their My Documents view.
          </DialogDescription>
        </DialogHeader>

        {document && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-recipient">Recipient</Label>
                <Select
                  value={recipientId || EMPTY_USER}
                  onValueChange={(value) => setRecipientId(value === EMPTY_USER ? "" : value)}
                >
                  <SelectTrigger id="share-recipient">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search name, email, role..."
                          className="pl-8 h-9"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        />
                      </div>
                    </div>
                    <SelectItem value={EMPTY_USER}>Choose recipient</SelectItem>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email} • {user.systemRole}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-users" disabled>
                        No users match your search
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

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

              {selectedUser && (
                <p className="text-xs text-muted-foreground">
                  {selectedUser.name} will gain read access to this document. You can revoke it later from the
                  Permissions panel.
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !recipientId}>
                  {isSubmitting ? 'Sharing…' : 'Share Document'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
