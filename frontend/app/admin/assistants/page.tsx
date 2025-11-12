"use client";
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { 
  Briefcase,
  Plus,
  Search,
  UserMinus,
  Edit3
} from 'lucide-react';
import { useOrganization, type AssistantAssignment } from '@/contexts/OrganizationContext';
import { AssistantAssignmentModal } from '@/components/admin/AssistantAssignmentModal';
import { useCurrentUser } from '@/hooks/use-current-user';
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

const AssistantsManagement = () => {
  const { assistantAssignments, users, deleteAssignment } = useOrganization();
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<AssistantAssignment | undefined>(undefined);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string>('');

  const isSuperAdmin = currentUser?.systemRole === 'Super Admin';

  const managementGrades = ['MDCS', 'EDCS', 'MSS1', 'MSS2'];

  // Get executives (MD, ED, GM, AGM)
  const executives = users.filter((user) => managementGrades.includes(user.gradeLevel));

  const filteredExecutives = executives.filter(exec =>
    exec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exec.systemRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleExecutives = isSuperAdmin
    ? filteredExecutives
    : filteredExecutives.filter((exec) => exec.id === currentUser?.id);

  const getAssistantsForExecutive = (execId: string) => {
    return assistantAssignments.filter(a => a.executiveId === execId);
  };

  const getAssistantInfo = (assistantId: string) => {
    return users.find(u => u.id === assistantId);
  };

  const canManageExecutive = (execId: string) => {
    if (isSuperAdmin) return true;
    return execId === currentUser?.id;
  };

  const handleAssignAssistant = (execId: string) => {
    if (!canManageExecutive(execId)) {
      toast({ title: 'Action not allowed', description: 'Only the executive or super admin can modify these assistants.', variant: 'destructive' });
      return;
    }
    setSelectedExecutiveId(execId);
    setSelectedAssignment(undefined);
    setAssignmentModalOpen(true);
  };

  const handleEditPermissions = (assignment: AssistantAssignment) => {
    if (!canManageExecutive(assignment.executiveId)) {
      toast({ title: 'Action not allowed', description: 'Only the executive or super admin can modify these assistants.', variant: 'destructive' });
      return;
    }
    setSelectedExecutiveId(assignment.executiveId);
    setSelectedAssignment(assignment);
    setAssignmentModalOpen(true);
  };

  const handleRemoveAssistant = (assignmentId: string) => {
    const assignment = assistantAssignments.find((item) => item.id === assignmentId);
    if (!assignment) return;

    if (!canManageExecutive(assignment.executiveId)) {
      toast({ title: 'Action not allowed', description: 'Only the executive or super admin can modify these assistants.', variant: 'destructive' });
      return;
    }

    setAssignmentToRemove(assignmentId);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = async () => {
    if (assignmentToRemove) {
      try {
        await deleteAssignment(assignmentToRemove);
        toast({ title: "Success", description: "Assistant removed successfully" });
        setRemoveDialogOpen(false);
        setAssignmentToRemove('');
      } catch (error) {
        const description = error instanceof Error ? error.message : 'Unable to remove assistant';
        toast({ title: 'Request failed', description, variant: 'destructive' });
      }
    }
  };

  const totalAssistants = assistantAssignments.length;
  const totalTAs = assistantAssignments.filter(a => a.type === 'TA').length;
  const totalPAs = assistantAssignments.filter(a => a.type === 'PA').length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-accent" />
              Assistants Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Technical Assistants (TAs) and Personal Assistants (PAs)
            </p>
          </div>
        </div>

        <HelpGuideCard
          title="Coordinate Executive Support"
          description="Assign technical or personal assistants to MD, ED, GM, and AGM roles. Edit permissions, reassign coverage, and remove assistants while tracking total counts by assistant type."
          links={[
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assistants</p>
                  <p className="text-2xl font-bold">{totalAssistants}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Briefcase className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technical Assistants</p>
                  <p className="text-2xl font-bold">{totalTAs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <Briefcase className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Personal Assistants</p>
                  <p className="text-2xl font-bold">{totalPAs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Executives</p>
                  <p className="text-2xl font-bold">{executives.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search executives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Executive Assistants */}
        <div className="space-y-4">
          {visibleExecutives.map(executive => {
            const assignments = getAssistantsForExecutive(executive.id);
            const canManage = canManageExecutive(executive.id);

            return (
              <Card key={executive.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{executive.name}</p>
                        <p className="text-sm text-muted-foreground font-normal">
                          {executive.systemRole} - {executive.gradeLevel}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {assignments.length} Assistant{assignments.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                    <Button 
                      size="sm"
                      onClick={() => handleAssignAssistant(executive.id)}
                      className="bg-gradient-primary"
                      disabled={!canManage}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {canManage ? 'Assign Assistant' : 'View Only'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No assistants assigned yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {assignments.map(assignment => {
                        const assistant = getAssistantInfo(assignment.assistantId);
                        return (
                          <div
                            key={assignment.id}
                            className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-all"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground">
                                    {assistant?.name || 'Unknown'}
                                  </h4>
                                  <Badge variant={assignment.type === 'TA' ? 'default' : 'secondary'}>
                                    {assignment.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.specialization || 'General'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {assignment.permissions.length} permissions
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPermissions(assignment)}
                                className="flex-1"
                                disabled={!canManage}
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1" />
                                Permissions
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveAssistant(assignment.id)}
                                disabled={!canManage}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {visibleExecutives.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                {currentUser ? 'No executives found matching your criteria.' : 'Select a persona to manage assistants.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AssistantAssignmentModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        executiveId={selectedExecutiveId}
        assignment={selectedAssignment}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assistant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this assistant assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AssistantsManagement;
