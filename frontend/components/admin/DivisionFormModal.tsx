import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, Division } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface DivisionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: Division;
}

export const DivisionFormModal = ({ open, onOpenChange, division }: DivisionFormModalProps) => {
  const { addDivision, updateDivision, users, directorates } = useOrganization();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    directorateId: '',
    generalManagerId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (division) {
      setFormData({
        name: division.name,
        code: division.code,
        directorateId: division.directorateId,
        generalManagerId: division.generalManagerId,
      });
    } else {
      setFormData({ name: '', code: '', directorateId: '', generalManagerId: '' });
    }
  }, [division, open]);

  const generalManagers = users.filter(u => u.gradeLevel === 'MSS1');
  const activeDirectorates = directorates.filter(dir => dir.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.directorateId || !formData.generalManagerId) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (division) {
        await updateDivision(division.id, {
          ...formData,
          generalManagerId: formData.generalManagerId || null,
        });
        toast({ title: "Success", description: "Division updated successfully" });
      } else {
        await addDivision({
          ...formData,
          generalManagerId: formData.generalManagerId || null,
          isActive: true,
        });
        toast({ title: "Success", description: "Division created successfully" });
      }
      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save division';
      toast({ title: 'Request failed', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{division ? 'Edit Division' : 'Create Division'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Division Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Finance Division"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="code">Division Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., FIN-DIV"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="directorate">Directorate</Label>
            <Select value={formData.directorateId} onValueChange={(value) => setFormData({ ...formData, directorateId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select directorate" />
              </SelectTrigger>
              <SelectContent>
                {activeDirectorates.map(dir => (
                  <SelectItem key={dir.id} value={dir.id}>{dir.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gm">General Manager</Label>
            <Select value={formData.generalManagerId} onValueChange={(value) => setFormData({ ...formData, generalManagerId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select GM" />
              </SelectTrigger>
              <SelectContent>
                {generalManagers.map(gm => (
                  <SelectItem key={gm.id} value={gm.id}>{gm.name} - {gm.systemRole}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {division ? (isSubmitting ? 'Updating…' : 'Update') : isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
