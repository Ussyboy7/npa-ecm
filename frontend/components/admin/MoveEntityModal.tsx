import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import { Users, Building2, FileText, AlertTriangle } from 'lucide-react';

interface MoveEntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'division' | 'department';
  entityId: string;
  entityName: string;
  currentParentId: string;
}

export const MoveEntityModal = ({ open, onOpenChange, entityType, entityId, entityName, currentParentId }: MoveEntityModalProps) => {
  const { updateDivision, updateDepartment, divisions, directorates, users, departments } = useOrganization();
  const [newParentId, setNewParentId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  
  // Calculate impact analysis
  const impactAnalysis = useMemo(() => {
    if (!newParentId || newParentId === currentParentId) return null;
    
    if (entityType === 'division') {
      const division = divisions.find(d => d.id === entityId);
      const affectedUsers = users.filter(u => u.division === entityId);
      const affectedDepartments = departments.filter(d => d.divisionId === entityId);
      const newDirectorate = directorates.find(d => d.id === newParentId);
      
      return {
        type: 'division',
        affectedUsers: affectedUsers.length,
        affectedDepartments: affectedDepartments.length,
        currentDirectorate: directorates.find(d => d.id === currentParentId)?.name || 'Unknown',
        newDirectorate: newDirectorate?.name || 'Unknown',
      };
    } else {
      const department = departments.find(d => d.id === entityId);
      const affectedUsers = users.filter(u => u.department === entityId);
      const currentDivision = divisions.find(d => d.id === currentParentId);
      const newDivision = divisions.find(d => d.id === newParentId);
      
      return {
        type: 'department',
        affectedUsers: affectedUsers.length,
        currentDivision: currentDivision?.name || 'Unknown',
        newDivision: newDivision?.name || 'Unknown',
      };
    }
  }, [newParentId, currentParentId, entityType, entityId, divisions, directorates, users, departments]);

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
              <SelectTrigger aria-label={`Select new ${entityType === 'division' ? 'directorate' : 'division'}`}>
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
          
          {/* Impact Analysis */}
          {impactAnalysis && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <p className="font-semibold">Impact Analysis:</p>
                  {impactAnalysis.type === 'division' ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>Moving from <strong>{impactAnalysis.currentDirectorate}</strong> to <strong>{impactAnalysis.newDirectorate}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span><strong>{impactAnalysis.affectedUsers}</strong> user{impactAnalysis.affectedUsers !== 1 ? 's' : ''} will be affected</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span><strong>{impactAnalysis.affectedDepartments}</strong> department{impactAnalysis.affectedDepartments !== 1 ? 's' : ''} will be moved</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>Moving from <strong>{impactAnalysis.currentDivision}</strong> to <strong>{impactAnalysis.newDivision}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span><strong>{impactAnalysis.affectedUsers}</strong> user{impactAnalysis.affectedUsers !== 1 ? 's' : ''} will be affected</span>
                      </div>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setNewParentId('');
            }}
            aria-label="Cancel move operation"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={isMoving || !newParentId || newParentId === currentParentId}
            aria-label={`Move ${entityName} to selected ${entityType === 'division' ? 'directorate' : 'division'}`}
          >
            {isMoving ? 'Moving…' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
