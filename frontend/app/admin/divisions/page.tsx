"use client";
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { 
  Building2,
  Plus,
  Search,
  Edit3,
  Archive,
  History,
  Users
} from 'lucide-react';
import { DIRECTORATES } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DivisionFormModal } from '@/components/admin/DivisionFormModal';
import { MoveEntityModal } from '@/components/admin/MoveEntityModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';

const DivisionsManagement = () => {
  const { directorates, divisions, users, deleteDivision } = useOrganization();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<any>(null);

  const filteredDivisions = mounted ? divisions.filter(div =>
    div.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    div.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const getDirectorateName = (dirId: string) => {
    const dir = directorates.find(d => d.id === dirId);
    if (dir) return dir.name;
    return DIRECTORATES.find(d => d.id === dirId)?.name || 'Unknown';
  };

  const getGMName = (gmId: string) => {
    return users.find(u => u.id === gmId)?.name || 'Not assigned';
  };

  const handleCreateDivision = () => {
    setSelectedDivision(null);
    setFormModalOpen(true);
  };

  const handleEditDivision = (division: any) => {
    setSelectedDivision(division);
    setFormModalOpen(true);
  };

  const handleMoveDivision = (division: any) => {
    setSelectedDivision(division);
    setMoveModalOpen(true);
  };

  const handleDeactivate = (division: any) => {
    setSelectedDivision(division);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivate = () => {
    if (selectedDivision) {
      deleteDivision(selectedDivision.id);
      toast({ title: "Success", description: "Division deactivated successfully" });
      setDeactivateDialogOpen(false);
      setSelectedDivision(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              Division Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage organizational divisions and their directorate assignments
            </p>
          </div>
          <Button onClick={handleCreateDivision} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Division
          </Button>
        </div>

        <HelpGuideCard
          title="Maintain Divisions"
          description="Create, edit, deactivate, or move divisions across directorates. Review General Manager assignments and department counts before making structural changes."
          links={[
            { label: "Directorates", href: "/admin/directorates" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Divisions</p>
                  <p className="text-2xl font-bold">{mounted ? divisions.length : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <Building2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {mounted ? divisions.filter(d => d.isActive).length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With GMs</p>
                  <p className="text-2xl font-bold">
                    {mounted ? divisions.filter(d => d.generalManagerId).length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Archive className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">
                    {mounted ? divisions.filter(d => !d.isActive).length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search divisions by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Divisions by Directorate */}
        <div className="space-y-6">
          {(mounted ? directorates : directorates).filter(dir => dir.isActive).map(directorate => {
            const dirDivisions = filteredDivisions.filter(
              div => div.directorateId === directorate.id && div.isActive
            );

            if (!dirDivisions.length) return null;

            return (
              <Card key={directorate.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {directorate.name}
                    <Badge variant="secondary" className="ml-2">
                      {dirDivisions.length} Divisions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dirDivisions.map(division => (
                      <div
                        key={division.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">
                                {division.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {division.code}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-success bg-success/10">
                                Active
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                GM: {getGMName(division.generalManagerId)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                Directorate: {getDirectorateName(division.directorateId)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDivision(division)}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveDivision(division)}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Move
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivate(division)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Deactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <DivisionFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        division={selectedDivision}
      />

      {selectedDivision && (
        <MoveEntityModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          entityType="division"
          entityId={selectedDivision.id}
          entityName={selectedDivision.name}
          currentParentId={selectedDivision.directorateId}
        />
      )}

      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Division</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{selectedDivision?.name}"? This will hide it from active lists but won't delete any data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DivisionsManagement;
