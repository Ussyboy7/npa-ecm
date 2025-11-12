import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, Directorate } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface DirectorateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directorate?: Directorate;
}

const EMPTY_VALUE = "__none";

export const DirectorateFormModal = ({ open, onOpenChange, directorate }: DirectorateFormModalProps) => {
  const { addDirectorate, updateDirectorate, users } = useOrganization();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    executiveDirectorId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (directorate) {
      setFormData({
        name: directorate.name,
        code: directorate.code,
        description: directorate.description || '',
        executiveDirectorId: directorate.executiveDirectorId || '',
      });
    } else {
      setFormData({ name: '', code: '', description: '', executiveDirectorId: '' });
    }
  }, [directorate, open]);

  // Get eligible executive directors (MDCS, EDCS grade levels)
  const executiveDirectors = users.filter(u => ['MDCS', 'EDCS'].includes(u.gradeLevel));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast({ title: "Error", description: "Name and code are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (directorate) {
        await updateDirectorate(directorate.id, {
          ...formData,
          executiveDirectorId: formData.executiveDirectorId || null,
        });
        toast({ title: "Success", description: "Directorate updated successfully" });
      } else {
        await addDirectorate({
          ...formData,
          executiveDirectorId: formData.executiveDirectorId || null,
          isActive: true,
        });
        toast({ title: "Success", description: "Directorate created successfully" });
      }
      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save directorate';
      toast({ title: 'Request failed', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{directorate ? 'Edit Directorate' : 'Create Directorate'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Directorate Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Finance & Administration"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="code">Directorate Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., FA"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the directorate's responsibilities"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="executiveDirector">Executive Director (Optional)</Label>
            <Select 
              value={formData.executiveDirectorId || EMPTY_VALUE} 
              onValueChange={(value) => setFormData({ ...formData, executiveDirectorId: value === EMPTY_VALUE ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select executive director" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Not assigned</SelectItem>
                {executiveDirectors.map(ed => (
                  <SelectItem key={ed.id} value={ed.id}>
                    {ed.name} - {ed.gradeLevel} ({ed.systemRole})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {directorate ? (isSubmitting ? 'Updating…' : 'Update') : isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

