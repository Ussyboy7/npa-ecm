import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization, AssistantAssignment } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface AssistantAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executiveId: string;
  assignment?: AssistantAssignment;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'view', label: 'View Documents' },
  { id: 'draft', label: 'Draft Responses' },
  { id: 'schedule', label: 'Manage Calendar' },
  { id: 'coordinate', label: 'Coordinate Meetings' },
  { id: 'forward', label: 'Forward Documents' },
];

export const AssistantAssignmentModal = ({ open, onOpenChange, executiveId, assignment }: AssistantAssignmentModalProps) => {
  const { addAssignment, updateAssignment, users, assistantAssignments } = useOrganization();
  const [formData, setFormData] = useState({
    assistantId: '',
    type: 'TA' as 'TA' | 'PA',
    specialization: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        assistantId: assignment.assistantId,
        type: assignment.type,
        specialization: assignment.specialization || '',
        permissions: assignment.permissions,
      });
    } else {
      setFormData({ assistantId: '', type: 'TA', specialization: '', permissions: ['view'] });
    }
  }, [assignment, open]);

  const assignedAssistantIds = useMemo(() => {
    return assistantAssignments
      .filter((a) => a.executiveId === executiveId && (!assignment || a.id !== assignment.id))
      .map((a) => a.assistantId);
  }, [assistantAssignments, executiveId, assignment?.id]);

  const availableAssistants = useMemo(() => {
    const base = users
      .filter((user) => user.active !== false && user.id !== executiveId && user.systemRole !== 'Super Admin')
      .filter((user) => !assignedAssistantIds.includes(user.id));

    // Include the currently assigned assistant when editing even if filtered out
    if (assignment) {
      const currentAssistant = users.find((user) => user.id === assignment.assistantId);
      if (currentAssistant && !base.some((user) => user.id === currentAssistant.id)) {
        base.push(currentAssistant);
      }
    }

    return base.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, executiveId, assignedAssistantIds, assignment]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assistantId) {
      toast({ title: "Error", description: "Please select an assistant", variant: "destructive" });
      return;
    }

    if (formData.permissions.length === 0) {
      toast({ title: "Error", description: "Please select at least one permission", variant: "destructive" });
      return;
    }

    const duplicate = assistantAssignments.some((existing) =>
      existing.executiveId === executiveId &&
      existing.assistantId === formData.assistantId &&
      (!assignment || existing.id !== assignment.id),
    );

    if (duplicate) {
      toast({ title: "Duplicate", description: "This assistant is already assigned to the executive.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (assignment) {
        await updateAssignment(assignment.id, { ...formData });
        toast({ title: "Success", description: "Assignment updated successfully" });
      } else {
        await addAssignment({ executiveId, ...formData });
        toast({ title: "Success", description: "Assistant assigned successfully" });
      }
      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : (assignment ? 'Unable to update assignment' : 'Unable to create assignment');
      toast({ title: 'Request failed', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Assignment' : 'Assign Assistant'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assistant">Assistant</Label>
            <Select value={formData.assistantId} onValueChange={(value) => setFormData({ ...formData, assistantId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select assistant" />
              </SelectTrigger>
              <SelectContent>
                {availableAssistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name} - {assistant.gradeLevel} ({assistant.systemRole})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value: 'TA' | 'PA') => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TA">Technical Assistant (TA)</SelectItem>
                <SelectItem value="PA">Personal Assistant (PA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization (Optional)</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="e.g., Finance, Legal, Operations"
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2 border rounded-md p-4">
              {AVAILABLE_PERMISSIONS.map(permission => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission.id}
                    checked={formData.permissions.includes(permission.id)}
                    onCheckedChange={() => togglePermission(permission.id)}
                  />
                  <label htmlFor={permission.id} className="text-sm cursor-pointer">
                    {permission.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (assignment ? 'Updating…' : 'Assigning…') : (assignment ? 'Update' : 'Assign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
