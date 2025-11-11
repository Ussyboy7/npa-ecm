import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, Department } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface DepartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
}

const EMPTY_VALUE = "__none";

export const DepartmentFormModal = ({ open, onOpenChange, department }: DepartmentFormModalProps) => {
  const { addDepartment, updateDepartment, divisions, users } = useOrganization();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    divisionId: '',
    assistantGeneralManagerId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        divisionId: department.divisionId,
        assistantGeneralManagerId: department.assistantGeneralManagerId || '',
      });
    } else {
      setFormData({ name: '', code: '', divisionId: '', assistantGeneralManagerId: '' });
    }
  }, [department, open]);

  const activeDivisions = divisions.filter(d => d.isActive);
  const assistantGeneralManagers = users.filter(u => u.gradeLevel === 'MSS2');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.divisionId) {
      toast({ title: "Error", description: "Name, code, and division are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (department) {
        await updateDepartment(department.id, {
          ...formData,
          assistantGeneralManagerId: formData.assistantGeneralManagerId || null,
        });
        toast({ title: "Success", description: "Department updated successfully" });
      } else {
        await addDepartment({
          ...formData,
          assistantGeneralManagerId: formData.assistantGeneralManagerId || null,
          isActive: true,
        });
        toast({ title: "Success", description: "Department created successfully" });
      }

      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save department';
      toast({ title: 'Request failed', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Create Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Budget & Planning"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="code">Department Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., FIN-BP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Select
              value={formData.divisionId || EMPTY_VALUE}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  divisionId: value === EMPTY_VALUE ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Unassigned</SelectItem>
                {activeDivisions.map(div => (
                  <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agm">Assistant General Manager (Optional)</Label>
            <Select
              value={formData.assistantGeneralManagerId || EMPTY_VALUE}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  assistantGeneralManagerId: value === EMPTY_VALUE ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AGM (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>None</SelectItem>
                {assistantGeneralManagers.map(agm => (
                  <SelectItem key={agm.id} value={agm.id}>{agm.name} - {agm.systemRole}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {department ? (isSubmitting ? 'Updating…' : 'Update') : isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
