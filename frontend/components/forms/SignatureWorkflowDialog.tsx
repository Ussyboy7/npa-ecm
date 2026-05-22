"use client";

import { useState, useEffect } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Send } from "lucide-react";
import { toast } from "sonner";
import { createSignatureWorkflow } from "@/lib/api/forms";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormSubmission, FormField } from "@/lib/types/forms";

interface SignatureWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FormSubmission;
  onWorkflowCreated?: (workflowId: string) => void;
}

interface SignatureAssignment {
  field_name: string;
  field_label: string;
  user_id?: string;
}

export function SignatureWorkflowDialog({
  open,
  onOpenChange,
  submission,
  onWorkflowCreated,
}: SignatureWorkflowDialogProps) {
  const { users: organizationUsers } = useOrganization();
  const [assignments, setAssignments] = useState<SignatureAssignment[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openUserSelectors, setOpenUserSelectors] = useState<Record<number, boolean>>({});

  // Get signature fields from template
  const signatureFields = (submission.template.structure?.fields || []).filter(
    (field) => field.type === "file" && field.name.toLowerCase().includes("signature")
  );

  useEffect(() => {
    if (open && signatureFields.length > 0 && assignments.length === 0) {
      // Initialize assignments for all signature fields
      setAssignments(
        signatureFields.map((field) => ({
          field_name: field.name,
          field_label: field.label,
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signatureFields]);

  const handleAddAssignment = () => {
    if (signatureFields.length > 0) {
      setAssignments([
        ...assignments,
        {
          field_name: signatureFields[0].name,
          field_label: signatureFields[0].label,
        },
      ]);
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleUpdateAssignment = (index: number, updates: Partial<SignatureAssignment>) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], ...updates };
    setAssignments(newAssignments);
  };

  const handleSubmit = async () => {
    if (assignments.length === 0) {
      toast.error("Please add at least one signature assignment");
      return;
    }

    // Validate assignments - must have a user assigned
    for (const assignment of assignments) {
      if (!assignment.user_id) {
        toast.error(`Please assign ${assignment.field_label} to a user`);
        return;
      }
    }

    try {
      setSubmitting(true);
      
      // If submission.id looks like a form document ID (not a submission), create a submission first
      let submissionId = submission.id;
      if (!submission.id.includes('-') || submission.id.length === 36) {
        // This might be a form document ID, try to create a submission
        try {
          const { createFormSubmission } = await import("@/lib/api/forms");
          const newSubmission = await createFormSubmission({
            template_id: submission.template.id,
            data: submission.data || {},
            is_draft: false,
          });
          submissionId = newSubmission.id;
        } catch (createError) {
          // If creation fails, use the original ID (might work if backend supports it)
          logWarn("Could not create FormSubmission, using provided ID:", createError);
        }
      }
      
      // Convert assignments to backend format (assign to user directly)
      const signature_assignments = assignments.map((assignment) => ({
        field_name: assignment.field_name,
        field_label: assignment.field_label,
        user_id: assignment.user_id,
      }));

      const workflow = await createSignatureWorkflow({
        submission_id: submissionId,
        routing_mode: "parallel", // Always parallel when assigning to users directly
        signature_assignments,
        notes: notes || undefined,
      });

      toast.success("Signature workflow created successfully");
      onWorkflowCreated?.(workflow.id);
      onOpenChange(false);
      setAssignments([]);
      setNotes("");
    } catch (error: unknown) {
      logError("Error creating signature workflow:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create signature workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Route Form for Signatures</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-muted/50 border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Assign each signature field directly to a user. The user will be able to provide their signature and all required information when they sign.
              </p>
            </div>

            {/* Signature Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Signature Assignments</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAssignment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </div>

              {assignments.map((assignment, index) => {
                const selectedUser = organizationUsers.find(u => u.id === assignment.user_id);
                
                return (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label className="text-sm font-semibold mb-2 block">
                              {assignment.field_label}
                            </Label>
                            <Popover 
                              open={openUserSelectors[index] || false} 
                              onOpenChange={(open) => setOpenUserSelectors(prev => ({ ...prev, [index]: open }))}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {selectedUser ? (
                                    <span className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      {selectedUser.name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Select user...</span>
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search users..." />
                                  <CommandList>
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                      {organizationUsers
                                        .filter((user) => user.active)
                                        .map((user) => (
                                          <CommandItem
                                            key={user.id}
                                            value={user.id}
                                            onSelect={() => {
                                              handleUpdateAssignment(index, {
                                                user_id: user.id,
                                              });
                                              setOpenUserSelectors(prev => ({ ...prev, [index]: false }));
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                assignment.user_id === user.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex flex-col">
                                              <span>{user.name}</span>
                                              {user.email && (
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        {assignments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAssignment(index)}
                            className="mt-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or instructions for signers..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || assignments.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Creating..." : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

