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

export const DepartmentFormModal = ({ open, onOpenChange, department }: DepartmentFormModalProps) => {
  const { addDepartment, updateDepartment, divisions, users } = useOrganization();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    divisionId: '',
    assistantGeneralManagerId: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.divisionId) {
      toast({ title: "Error", description: "Name, code, and division are required", variant: "destructive" });
      return;
    }

    if (department) {
      updateDepartment(department.id, { ...formData });
      toast({ title: "Success", description: "Department updated successfully" });
    } else {
      addDepartment({ ...formData, isActive: true });
      toast({ title: "Success", description: "Department created successfully" });
    }
    
    onOpenChange(false);
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
            <Select value={formData.divisionId} onValueChange={(value) => setFormData({ ...formData, divisionId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {activeDivisions.map(div => (
                  <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agm">Assistant General Manager (Optional)</Label>
            <Select value={formData.assistantGeneralManagerId} onValueChange={(value) => setFormData({ ...formData, assistantGeneralManagerId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select AGM (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {assistantGeneralManagers.map(agm => (
                  <SelectItem key={agm.id} value={agm.id}>{agm.name} - {agm.systemRole}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{department ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
