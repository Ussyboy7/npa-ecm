import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface MoveEntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'division' | 'department';
  entityId: string;
  entityName: string;
  currentParentId: string;
}

export const MoveEntityModal = ({ open, onOpenChange, entityType, entityId, entityName, currentParentId }: MoveEntityModalProps) => {
  const { updateDivision, updateDepartment, divisions, directorates } = useOrganization();
  const [newParentId, setNewParentId] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (!newParentId) {
      toast({ title: "Error", description: "Please select a destination", variant: "destructive" });
      return;
    }

    if (newParentId === currentParentId) {
      toast({ title: "Error", description: "Entity is already in this location", variant: "destructive" });
      return;
    }

    setIsMoving(true);
    try {
      if (entityType === 'division') {
        await updateDivision(entityId, { directorateId: newParentId });
        const directorate = directorates.find(d => d.id === newParentId);
        toast({ 
          title: "Success", 
          description: `Division moved to ${directorate?.name ?? 'selected directorate'}` 
        });
      } else {
        await updateDepartment(entityId, { divisionId: newParentId });
        const division = divisions.find(d => d.id === newParentId);
        toast({ 
          title: "Success", 
          description: `Department moved to ${division?.name ?? 'selected division'}` 
        });
      }

      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to move entity';
      toast({ title: 'Move failed', description, variant: 'destructive' });
    } finally {
      setIsMoving(false);
    }
  };

  const activeDivisions = divisions.filter(d => d.isActive);
  const activeDirectorates = directorates.filter(d => d.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {entityType === 'division' ? 'Division' : 'Department'}</DialogTitle>
          <DialogDescription>
            Select a new parent for "{entityName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              {entityType === 'division' ? 'New Directorate' : 'New Division'}
            </Label>
            <Select value={newParentId} onValueChange={setNewParentId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${entityType === 'division' ? 'directorate' : 'division'}`} />
              </SelectTrigger>
              <SelectContent>
                {entityType === 'division' 
                  ? activeDirectorates.map(dir => (
                      <SelectItem key={dir.id} value={dir.id} disabled={dir.id === currentParentId}>
                        {dir.name} {dir.id === currentParentId && '(Current)'}
                      </SelectItem>
                    ))
                  : activeDivisions.map(div => (
                      <SelectItem key={div.id} value={div.id} disabled={div.id === currentParentId}>
                        {div.name} {div.id === currentParentId && '(Current)'}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Moving…' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
