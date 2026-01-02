"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Users, User, Building2, Briefcase } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { updateFormDocument } from '@/lib/api/dms-forms';
import { createNotification } from '@/lib/notifications-storage';
import type { FormDocument } from '@/lib/api/dms-forms';

interface ForwardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDocument | null;
  onForwarded?: () => void;
}

type ForwardTarget = {
  type: 'user' | 'division' | 'department';
  id: string;
  name: string;
};

export function ForwardFormDialog({
  open,
  onOpenChange,
  form,
  onForwarded,
}: ForwardFormDialogProps) {
  const { currentUser } = useCurrentUser();
  const { users, divisions, departments } = useOrganization();
  const [forwarding, setForwarding] = useState(false);
  const [targetType, setTargetType] = useState<'user' | 'division' | 'department'>('user');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState<'review' | 'input' | 'signature'>('review');

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setSelectedUsers([]);
      setSelectedDivision('');
      setSelectedDepartment('');
      setMessage('');
      setTargetType('user');
      setActionType('review');
    }
  }, [open]);

  const handleForward = async () => {
    if (!form) return;

    // Validate selection
    if (targetType === 'user' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    if (targetType === 'division' && !selectedDivision) {
      toast.error('Please select a division');
      return;
    }
    if (targetType === 'department' && !selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    try {
      setForwarding(true);

      // Update form status to in_progress if it's draft
      if (form.status === 'draft') {
        await updateFormDocument(form.id, {
          status: 'in_progress',
        });
      }

      // Create notifications for forwarded users
      const notificationPromises: Promise<unknown>[] = [];
      const actionUrl = `/dms/${form.document.id}`;
      const actionText = actionType === 'review' ? 'review' : actionType === 'input' ? 'provide input on' : 'sign';
      
      if (targetType === 'user' && selectedUsers.length > 0) {
        // Notify specific users
        for (const userId of selectedUsers) {
          const user = availableUsers.find(u => u.id === userId);
          if (user) {
            notificationPromises.push(
              createNotification({
                recipient: userId,
                title: `Form Forwarded: ${form.document.title}`,
                message: message || `You have been asked to ${actionText} this form.`,
                notificationType: actionType === 'signature' ? 'workflow' : 'document',
                priority: 'high',
                module: 'forms',
                relatedObjectType: 'form_document',
                relatedObjectId: form.document.id,
                actionUrl: actionUrl,
                actionRequired: true,
              }).catch(err => {
                logError(`Failed to notify user ${userId}`, err);
                // Don't fail the whole operation if one notification fails
              })
            );
          }
        }
      } else if (targetType === 'division' && selectedDivision) {
        // Notify all users in division
        const divisionUsers = availableUsers.filter(u => u.division === selectedDivision);
        for (const user of divisionUsers) {
            notificationPromises.push(
              createNotification({
                recipient: user.id,
                title: `Form Forwarded: ${form.document.title}`,
                message: message || `A form has been forwarded to your division for ${actionText}.`,
                notificationType: actionType === 'signature' ? 'workflow' : 'document',
                priority: 'high',
                module: 'forms',
                relatedObjectType: 'form_document',
                relatedObjectId: form.document.id,
                actionUrl: actionUrl,
                actionRequired: true,
              }).catch(err => {
                logError(`Failed to notify user ${user.id}`, err);
              })
            );
        }
      } else if (targetType === 'department' && selectedDepartment) {
        // Notify all users in department
        const departmentUsers = availableUsers.filter(u => u.department === selectedDepartment);
        for (const user of departmentUsers) {
            notificationPromises.push(
              createNotification({
                recipient: user.id,
                title: `Form Forwarded: ${form.document.title}`,
                message: message || `A form has been forwarded to your department for ${actionText}.`,
                notificationType: actionType === 'signature' ? 'workflow' : 'document',
                priority: 'high',
                module: 'forms',
                relatedObjectType: 'form_document',
                relatedObjectId: form.document.id,
                actionUrl: actionUrl,
                actionRequired: true,
              }).catch(err => {
                logError(`Failed to notify user ${user.id}`, err);
              })
            );
        }
      }

      // Wait for all notifications to be created (but don't fail if some fail)
      await Promise.allSettled(notificationPromises);

      toast.success('Form forwarded successfully');
      onForwarded?.();
      onOpenChange(false);
    } catch (error) {
      logError('Failed to forward form', error);
      toast.error('Failed to forward form');
    } finally {
      setForwarding(false);
    }
  };

  const availableUsers = users.filter(u => u.active);
  const availableDivisions = divisions.filter(d => d.isActive);
  const availableDepartments = departments.filter(d => d.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Forward Form
          </DialogTitle>
          <DialogDescription>
            Forward this form to users for {actionType === 'review' ? 'review' : actionType === 'input' ? 'input' : 'signature'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Form Info */}
          {form && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">{form.document.title}</div>
              {form.template && (
                <div className="text-xs text-muted-foreground mt-1">
                  Template: {form.template.name}
                </div>
              )}
            </div>
          )}

          {/* Action Type */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as 'review' | 'input' | 'signature')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="input">Input/Edit</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label>Forward To</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as 'user' | 'division' | 'department')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Specific Users</SelectItem>
                <SelectItem value="division">Division</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Selection */}
          {targetType === 'user' && (
            <div className="space-y-2">
              <Label>Select Users</Label>
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground">({user.email})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedUsers.map(userId => {
                    const user = availableUsers.find(u => u.id === userId);
                    return user ? (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {user.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Division Selection */}
          {targetType === 'division' && (
            <div className="space-y-2">
              <Label>Select Division</Label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a division" />
                </SelectTrigger>
                <SelectContent>
                  {availableDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{division.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Department Selection */}
          {targetType === 'department' && (
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{department.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label>Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note about why you're forwarding this form..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={forwarding}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={forwarding}>
            {forwarding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Forwarding...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Forward
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

