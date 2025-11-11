"use client";
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { 
  Layers,
  Plus,
  Search,
  Edit3,
  Archive,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DepartmentFormModal } from '@/components/admin/DepartmentFormModal';
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

const DepartmentsManagement = () => {
  const { departments, divisions, users, deleteDepartment } = useOrganization();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  const filteredDepartments = mounted ? departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const getDivisionName = (divId: string) => {
    return divisions.find(d => d.id === divId)?.name || 'Unassigned';
  };

  const getAGMName = (agmId?: string | null) => {
    if (!agmId) return 'Not assigned';
    return users.find(u => u.id === agmId)?.name || 'Not assigned';
  };

  const handleCreateDepartment = () => {
    setSelectedDepartment(null);
    setFormModalOpen(true);
  };

  const handleEdit = (department: any) => {
    setSelectedDepartment(department);
    setFormModalOpen(true);
  };

  const handleReassign = (department: any) => {
    setSelectedDepartment(department);
    setMoveModalOpen(true);
  };

  const handleDeactivate = (department: any) => {
    setSelectedDepartment(department);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!selectedDepartment || isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      toast({ title: "Success", description: "Department deactivated successfully" });
      setDeactivateDialogOpen(false);
      setSelectedDepartment(null);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to deactivate department';
      toast({ title: 'Request failed', description, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Layers className="h-8 w-8 text-secondary" />
              Department Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage departments and their division assignments
            </p>
          </div>
          <Button onClick={handleCreateDepartment} className="bg-gradient-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Create Department
          </Button>
        </div>

        <HelpGuideCard
          title="Manage Departments"
          description="Add, edit, deactivate, or reassign departments while keeping division and AGM ownership accurate. Confirm leadership roles and active status before communicating structural updates."
          links={[
            { label: "Divisions", href: "/admin/divisions" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <Layers className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Departments</p>
                  <p className="text-2xl font-bold">{mounted ? departments.length : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <Layers className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {mounted ? departments.filter(d => d.isActive).length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Building2 className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With AGMs</p>
                  <p className="text-2xl font-bold">
                    {mounted ? departments.filter(d => d.assistantGeneralManagerId).length : 0}
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
                    {mounted ? departments.filter(d => !d.isActive).length : 0}
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
            placeholder="Search departments by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Departments by Division */}
        <div className="space-y-6">
          {mounted ? divisions.filter(d => d.isActive).map(division => {
            const divDepartments = filteredDepartments.filter(
              dept => dept.divisionId === division.id && dept.isActive
            );

            if (divDepartments.length === 0) return null;

            return (
              <Card key={division.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {division.name}
                    <Badge variant="secondary" className="ml-2">
                      {mounted ? divDepartments.length : 0} Departments
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {divDepartments.map(department => (
                      <div
                        key={department.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-foreground">
                                {department.name}
                              </h4>
                              <Badge variant="outline" className="text-xs text-success bg-success/10">
                                Active
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {department.code}
                                </Badge>
                              </div>
                              <p>AGM: {getAGMName(department.assistantGeneralManagerId)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(department)}
                            className="flex-1"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReassign(department)}
                            className="flex-1"
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            Reassign
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeactivate(department)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          }) : null}
        </div>
      </div>

      <DepartmentFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        department={selectedDepartment}
      />

      {selectedDepartment && (
        <MoveEntityModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          entityType="department"
          entityId={selectedDepartment.id}
          entityName={selectedDepartment.name}
          currentParentId={selectedDepartment.divisionId}
        />
      )}

      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{selectedDepartment?.name}"? This will hide it from active lists but won't delete any data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DepartmentsManagement;
