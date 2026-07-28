import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
// AlertDialog removed - using separate Dialog for confirmation to avoid nesting issues
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from "@/components/ui/sonner";
import { formatDateShort } from "@/lib/datetime";
import { 
  Loader2, 
  UserCheck, 
  Eye, 
  Forward, 
  MessageSquare, 
  Shield, 
  Info,
  Clock,
  Bell,
  RotateCcw,
  Sparkles,
  User,
  UserPlus,
  ArrowLeft,
  Briefcase,
  Users,
  CalendarDays,
  Timer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { logError } from '@/lib/client-logger';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { apiFetch } from '@/lib/api-client';
import { format } from 'date-fns';

// Permission icons and descriptions
const PERMISSION_CONFIG: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  view: { 
    icon: <Eye className="h-3.5 w-3.5" />, 
    label: 'View', 
    description: 'Can view correspondence details and attachments' 
  },
  forward: { 
    icon: <Forward className="h-3.5 w-3.5" />, 
    label: 'Forward', 
    description: 'Can route to other recipients' 
  },
  respond: { 
    icon: <MessageSquare className="h-3.5 w-3.5" />, 
    label: 'Respond', 
    description: 'Can draft and send responses' 
  },
  minute: { 
    icon: <MessageSquare className="h-3.5 w-3.5" />, 
    label: 'Minute', 
    description: 'Can add minutes and notes' 
  },
};

// Quick instruction templates
const INSTRUCTION_TEMPLATES = [
  { label: 'Draft Response', text: 'Please draft a response for my review before sending.' },
  { label: 'Review & Summarize', text: 'Review the correspondence and provide a summary with recommendations.' },
  { label: 'Urgent Action', text: 'This is urgent. Please action immediately and keep me informed.' },
  { label: 'Follow Up', text: 'Please follow up with the sender and report back.' },
  { label: 'Briefing Note', text: 'Please prepare a briefing note with key points and background information.' },
  { label: 'Schedule Meeting', text: 'Please schedule a meeting with the sender to discuss this matter.' },
  { label: 'Obtain Info', text: 'Please obtain additional information/clarification from the sender.' },
  { label: 'Coordinate', text: 'Please coordinate with the relevant department and provide status update.' },
  { label: 'Research', text: 'Please research this matter and provide findings with recommendations.' },
  { label: 'Acknowledge Receipt', text: 'Please acknowledge receipt of this correspondence on my behalf.' },
];

// Delegation duration options
const DURATION_OPTIONS = [
  { value: 'until_completed', label: 'Until Completed', description: 'Active until correspondence is closed' },
  { value: '24h', label: '24 Hours', description: 'Expires in 1 day' },
  { value: '3d', label: '3 Days', description: 'Expires in 3 days' },
  { value: '1w', label: '1 Week', description: 'Expires in 7 days' },
  { value: '2w', label: '2 Weeks', description: 'Expires in 14 days' },
  { value: 'custom', label: 'Custom Date', description: 'Set a specific expiry date' },
];

interface DelegateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondenceId: string;
  executiveId: string;
  onDelegate: (assistantId: string, assistantType: 'TA' | 'PA', notes: string, duration?: string, expiresAt?: string) => Promise<void>;
}

export const DelegateModal = ({
  open,
  onOpenChange,
  correspondenceId,
  executiveId,
  onDelegate,
}: DelegateModalProps) => {
  const { assistantAssignments, users, addAssignment, divisions, departments, refreshOrganizationData, isSyncing } = useOrganization();
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [selectedAssistantError, setSelectedAssistantError] = useState('');
  const [delegationNotes, setDelegationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Duration state
  const [delegationDuration, setDelegationDuration] = useState('until_completed');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  
  // Delegation activity (audit)
  const [delegationActivity, setDelegationActivity] = useState<{
    total_actions: number;
    first_action_at: string | null;
    last_action_at: string | null;
  } | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Assignment mode state
  const [isAssigningMode, setIsAssigningMode] = useState(false);
  const [newAssistantId, setNewAssistantId] = useState('');
  const [newAssistantType, setNewAssistantType] = useState<'TA' | 'PA'>('PA');
  const [isAssigning, setIsAssigning] = useState(false);

  // Get the executive's user object to determine their organizational scope
  const executive = users.find(u => u.id === executiveId);

  // Get assistants assigned to this executive

  // Filter assignments for this executive (handle string/number type mismatch)
  const availableAssistants = assistantAssignments
    .filter(assignment => String(assignment.executiveId) === String(executiveId))
    .map(assignment => {
      const user = users.find(u => String(u.id) === String(assignment.assistantId));
      return {
        ...assignment,
        userName: user?.name || 'Unknown User',
      };
    });

  // Determine the executive's level and scope for hierarchical filtering
  // Grade codes: MDCS (MD), EDCS (ED), MSS1 (GM), MSS2 (AGM), MSS3 (Principal Manager), etc.
  // User type uses string names for directorate/division/department, not IDs
  const getExecutiveScope = () => {
    if (!executive) return { level: 'unknown', scope: 'all' as const };
    
    const gradeLevel = executive.gradeLevel?.toUpperCase() || '';
    const systemRole = executive.systemRole?.toLowerCase() || '';
    
    // MD can assign anyone in the organization (code: MDCS)
    if (gradeLevel === 'MDCS' || systemRole.includes('managing director')) {
      return { level: 'md', scope: 'all' as const };
    }
    
    // ED can assign anyone in their directorate (code: EDCS)
    if (gradeLevel === 'EDCS' || systemRole.includes('executive director')) {
      return { level: 'ed', scope: 'directorate' as const, directorate: executive.directorate };
    }
    
    // GM can assign anyone in their division (code: MSS1)
    if (gradeLevel === 'MSS1' || systemRole.includes('general manager')) {
      return { level: 'gm', scope: 'division' as const, division: executive.division };
    }
    
    // AGM can assign anyone in their department (code: MSS2)
    if (gradeLevel === 'MSS2' || systemRole.includes('assistant general manager')) {
      return { level: 'agm', scope: 'department' as const, department: executive.department };
    }
    
    // Principal Manager and below - department scope (codes: MSS3, MSS4, MSS5, SSS*, JSS*)
    if (gradeLevel.startsWith('MSS') || gradeLevel.startsWith('SSS') || gradeLevel.startsWith('JSS')) {
      return { level: 'staff', scope: 'department' as const, department: executive.department };
    }
    
    // Default: only same department for safety
    return { level: 'staff', scope: 'department' as const, department: executive.department };
  };

  const executiveScope = getExecutiveScope();

  // User fields (directorate, division, department) store IDs, not names
  // We need to find the executive's directorate ID to get all divisions/departments under it
  
  // For ED: Get all division IDs and department IDs in their directorate
  const executiveDirectorateId = executiveScope.directorate; // This is already an ID
  const divisionIdsInDirectorate = executiveScope.scope === 'directorate' && executiveDirectorateId
    ? divisions.filter(d => d.directorateId === executiveDirectorateId).map(d => d.id)
    : [];
  const departmentIdsInDirectorate = executiveScope.scope === 'directorate' && executiveDirectorateId
    ? departments.filter(d => divisionIdsInDirectorate.includes(d.divisionId || '')).map(d => d.id)
    : [];

  // For GM: Get all department IDs in their division
  const executiveDivisionId = executiveScope.division; // This is already an ID
  const departmentIdsInDivision = executiveScope.scope === 'division' && executiveDivisionId
    ? departments.filter(d => d.divisionId === executiveDivisionId).map(d => d.id)
    : [];

  // Get potential assistants based on hierarchical scope
  const potentialAssistants = users.filter(user => {
    // Exclude the executive themselves
    if (user.id === executiveId) return false;
    
    // Exclude users already assigned to this executive
    const alreadyAssigned = assistantAssignments.some(
      a => a.executiveId === executiveId && a.assistantId === user.id
    );
    if (alreadyAssigned) return false;

    // Apply hierarchical filtering based on executive's level
    // Note: user.directorate, user.division, user.department are IDs (UUIDs)
    switch (executiveScope.scope) {
      case 'all':
        // MD: Can see all users
        return true;
        
      case 'directorate':
        // ED: Can see users in their directorate (matching directorate ID, or in divisions/depts under it)
        return user.directorate === executiveDirectorateId ||
               divisionIdsInDirectorate.includes(user.division || '') ||
               departmentIdsInDirectorate.includes(user.department || '');
        
      case 'division':
        // GM: Can see users in their division (matching division ID, or in depts under it)
        return user.division === executiveDivisionId ||
               departmentIdsInDivision.includes(user.department || '');
        
      case 'department':
        // AGM/Dept Head: Can see only users in their department
        return user.department === executiveScope.department;
        
      default:
        // Fallback: same department only
        return user.department === executive?.department;
    }
  });

  // Get scope description for UI
  const getScopeDescription = () => {
    switch (executiveScope.scope) {
      case 'all':
        return 'All staff in the organization';
      case 'directorate':
        return 'Staff in your directorate';
      case 'division':
        return 'Staff in your division';
      case 'department':
        return 'Staff in your department';
      default:
        return 'Available staff';
    }
  };

  useEffect(() => {
    if (!open) {
      setSelectedAssistant('');
      setDelegationNotes('');
      setSelectedAssistantError('');
      setShowConfirmation(false);
      setIsAssigningMode(false);
      setNewAssistantId('');
      setNewAssistantType('PA');
      setDelegationDuration('until_completed');
      setCustomExpiryDate('');
    }
  }, [open]);

  // Calculate expiry date based on duration
  const calculateExpiryDate = (duration: string): string | undefined => {
    if (duration === 'until_completed') return undefined;
    if (duration === 'custom') return customExpiryDate || undefined;
    
    const now = new Date();
    switch (duration) {
      case '24h':
        now.setHours(now.getHours() + 24);
        break;
      case '3d':
        now.setDate(now.getDate() + 3);
        break;
      case '1w':
        now.setDate(now.getDate() + 7);
        break;
      case '2w':
        now.setDate(now.getDate() + 14);
        break;
    }
    return now.toISOString();
  };

  // Get duration display text
  const getDurationDisplayText = () => {
    const option = DURATION_OPTIONS.find(d => d.value === delegationDuration);
    if (delegationDuration === 'custom' && customExpiryDate) {
      return `Expires: ${formatDateShort(customExpiryDate)}`;
    }
    return option?.label || 'Until Completed';
  };

  const handleAssignAssistant = async () => {
    if (!newAssistantId) {
      toast.error('Please select a user to assign');
      return;
    }

    setIsAssigning(true);
    try {
      // Add the new assistant assignment
      await addAssignment({
        executiveId,
        assistantId: newAssistantId,
        type: newAssistantType,
        permissions: newAssistantType === 'PA' 
          ? ['view', 'forward', 'respond', 'minute'] 
          : ['view', 'forward'],
      });

      const assignedUser = users.find(u => u.id === newAssistantId);
      toast.success(`${assignedUser?.name || 'User'} assigned as ${newAssistantType}`, {
        description: 'You can now delegate correspondence to them'
      });

      // Reset and switch back to delegation mode
      setIsAssigningMode(false);
      setNewAssistantId('');
      // Auto-select the newly assigned assistant
      setSelectedAssistant(newAssistantId);
    } catch (error: unknown) {
      logError('Failed to assign assistant', error);
      
      // Check for duplicate assignment error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('unique set') || errorMessage.includes('already')) {
        const assignedUser = users.find(u => u.id === newAssistantId);
        toast.error(`${assignedUser?.name || 'This user'} is already assigned as your assistant`, {
          description: 'Refreshing your assistant list...'
        });
        // Refresh to sync the list, then switch back to delegation mode
        await refreshOrganizationData();
        setIsAssigningMode(false);
        setNewAssistantId('');
        // Auto-select the newly synced assistant if they appear in the list
        setTimeout(() => {
          const syncedAssignment = assistantAssignments.find(
            a => a.executiveId === executiveId && a.assistantId === newAssistantId
          );
          if (syncedAssignment) {
            setSelectedAssistant(newAssistantId);
          }
        }, 500);
      } else {
        toast.error('Failed to assign assistant', {
          description: 'Please try again or contact support'
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const validateForm = (): boolean => {
    setSelectedAssistantError('');

    if (!selectedAssistant) {
      setSelectedAssistantError('Please select an assistant');
      return false;
    }

    const assignment = availableAssistants.find(a => a.assistantId === selectedAssistant);
    if (!assignment) {
      setSelectedAssistantError('Invalid assistant selection');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const assignment = availableAssistants.find(a => a.assistantId === selectedAssistant);
    
    if (!assignment) {
      toast.error('Invalid assistant selection');
      setShowConfirmation(false);
      submittingRef.current = false;
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = calculateExpiryDate(delegationDuration);
      
      // Await the async onDelegate call
      await onDelegate(selectedAssistant, assignment.type, delegationNotes, delegationDuration, expiresAt);
      
      setShowConfirmation(false);
      onOpenChange(false);
      // Reset form state
      setSelectedAssistant('');
      setDelegationNotes('');
      setDelegationDuration('until_completed');
      setCustomExpiryDate('');
    } catch (error: unknown) {
      logError('[DelegateModal] onDelegate failed:', error);
      logError('Failed to delegate correspondence', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error as Record<string, unknown>);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const selectedAssistantData = availableAssistants.find(a => a.assistantId === selectedAssistant);

  // Fetch delegation activity when assistant is selected
  useEffect(() => {
    if (!selectedAssistant || !correspondenceId) {
      setDelegationActivity(null);
      return;
    }
    setLoadingActivity(true);
    apiFetch<{
      total_actions: number;
      first_action_at: string | null;
      last_action_at: string | null;
    }>(`/correspondence/correspondence-delegations/delegation-summary/?assistant_id=${selectedAssistant}&correspondence_id=${correspondenceId}`, {
      method: 'GET',
    }).then((data) => {
      if (data) setDelegationActivity(data);
    }).catch(() => {
      setDelegationActivity(null);
    }).finally(() => {
      setLoadingActivity(false);
    });
  }, [selectedAssistant, correspondenceId]);

  const handleTemplateClick = (template: string) => {
    setDelegationNotes(prev => prev ? `${prev}\n\n${template}` : template);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" height="fill">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Delegate to TA/PA
          </DialogTitle>
          <DialogDescription>
            Assign this correspondence to your Technical or Personal Assistant to handle on your behalf.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-220px)] pr-4">
          <div className="space-y-4 p-1 pr-0">
          {availableAssistants.length === 0 && !isAssigningMode ? (
            <div className="text-center py-6 space-y-4">
              {isSyncing ? (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Loading Assistants...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Checking for assigned TA/PA
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No Assistants Assigned</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You don't have any TA or PA assigned to you yet.
                    </p>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <Button
                      onClick={() => setIsAssigningMode(true)}
                      className="w-full"
                      variant="default"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign TA/PA Now
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Or contact the Registry/HR department for assistance
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : isAssigningMode ? (
            /* Assignment Mode UI */
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssigningMode(false)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <p className="font-medium text-sm">Assign New Assistant</p>
                  <p className="text-xs text-muted-foreground">Select a staff member to be your TA or PA</p>
                </div>
              </div>

              {/* Select User */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Select Staff Member *
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  {getScopeDescription()} ({potentialAssistants.length} available)
                </p>
                <Select 
                  value={newAssistantId} 
                  onValueChange={setNewAssistantId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a staff member" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {potentialAssistants.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No available staff members in your {executiveScope.scope === 'all' ? 'organization' : executiveScope.scope}
                      </div>
                    ) : (
                      potentialAssistants.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {user.gradeLevel && (
                              <span className="text-xs text-muted-foreground">• {user.gradeLevel}</span>
                            )}
                            {user.department && (
                              <span className="text-xs text-muted-foreground">
                                • {departments.find(d => d.id === user.department)?.name || user.department}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Assistant Type *
                </Label>
                <RadioGroup
                  value={newAssistantType}
                  onValueChange={(v) => setNewAssistantType(v as 'TA' | 'PA')}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newAssistantType === 'PA' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}`}>
                    <RadioGroupItem value="PA" id="type-pa" className="mt-0.5" />
                    <Label htmlFor="type-pa" className="cursor-pointer flex-1">
                      <div className="font-medium">Personal Assistant</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Full permissions: view, forward, respond, minute
                      </p>
                    </Label>
                  </div>
                  <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newAssistantType === 'TA' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}`}>
                    <RadioGroupItem value="TA" id="type-ta" className="mt-0.5" />
                    <Label htmlFor="type-ta" className="cursor-pointer flex-1">
                      <div className="font-medium">Technical Assistant</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Limited: view, forward only
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Preview Selected User */}
              {newAssistantId && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {users.find(u => u.id === newAssistantId)?.name}
                      </p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Will be assigned as <Badge variant={newAssistantType === 'PA' ? 'default' : 'secondary'}>{newAssistantType}</Badge>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assign Button */}
              <Button
                onClick={handleAssignAssistant}
                disabled={!newAssistantId || isAssigning}
                className="w-full"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign as {newAssistantType}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Assistant Selection */}
              <div className="space-y-2">
                <Label htmlFor="assistant" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Select Assistant *
                </Label>
                <Select 
                  value={selectedAssistant} 
                  onValueChange={(value) => {
                    setSelectedAssistant(value);
                    if (selectedAssistantError) setSelectedAssistantError('');
                  }}
                >
                  <SelectTrigger 
                    id="assistant"
                    aria-label="Select assistant"
                    aria-required="true"
                    aria-invalid={!!selectedAssistantError}
                    aria-describedby={selectedAssistantError ? "assistant-error" : undefined}
                  >
                    <SelectValue placeholder="Choose TA or PA" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssistants.map(assistant => (
                      <SelectItem key={assistant.assistantId} value={assistant.assistantId}>
                        <div className="flex items-center gap-2">
                          <Badge variant={assistant.type === 'PA' ? 'default' : 'secondary'} className="text-xs">
                            {assistant.type}
                          </Badge>
                          <span>{assistant.userName}</span>
                          {assistant.specialization && (
                            <span className="text-muted-foreground text-xs">• {assistant.specialization}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAssistantError && (
                  <p id="assistant-error" className="text-xs text-destructive" role="alert">
                    {selectedAssistantError}
                  </p>
                )}
              </div>

              {/* Permissions Display */}
              {selectedAssistantData && (
                <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Granted Permissions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssistantData.permissions.map(permission => {
                      const config = PERMISSION_CONFIG[permission] || { 
                        icon: <Eye className="h-3.5 w-3.5" />, 
                        label: permission,
                        description: permission 
                      };
                      return (
                        <div 
                          key={permission}
                          className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border rounded text-xs"
                          title={config.description}
                        >
                          {config.icon}
                          <span>{config.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delegation Activity Audit */}
              {selectedAssistantData && (
                <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Delegation Activity</span>
                  </div>
                  {loadingActivity ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading activity...
                    </div>
                  ) : delegationActivity && delegationActivity.total_actions > 0 ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Actions taken under delegation: <strong>{delegationActivity.total_actions}</strong></p>
                      {delegationActivity.first_action_at && (
                        <p>First action: {format(new Date(delegationActivity.first_action_at), 'PPp')}</p>
                      )}
                      {delegationActivity.last_action_at && (
                        <p>Last action: {format(new Date(delegationActivity.last_action_at), 'PPp')}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No delegated actions recorded for this correspondence.</p>
                  )}
                </div>
              )}

              {/* Delegation Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  Delegation Duration
                </Label>
                <Select value={delegationDuration} onValueChange={setDelegationDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">• {option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Custom date picker */}
                {delegationDuration === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="delegation-custom-expiry" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      Custom expiry date
                    </Label>
                    <Input
                      id="delegation-custom-expiry"
                      type="date"
                      value={customExpiryDate}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="flex-1"
                      aria-required="true"
                    />
                  </div>
                )}
              </div>

              {/* Delegation Instructions */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Instructions
                  <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                </Label>
                
                {/* Quick Templates */}
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUCTION_TEMPLATES.map((template, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => handleTemplateClick(template.text)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {template.label}
                    </Button>
                  ))}
                </div>

                <Textarea
                  id="notes"
                  placeholder="Add any specific instructions for the assistant..."
                  value={delegationNotes}
                  onChange={(e) => setDelegationNotes(e.target.value)}
                  rows={3}
                  maxLength={MODAL_CONSTANTS.DELEGATION_NOTES.MAX}
                  aria-label="Delegation instructions"
                  aria-describedby="notes-help"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {delegationNotes.length} / {MODAL_CONSTANTS.DELEGATION_NOTES.MAX}
                </p>
              </div>

              {/* What Happens Next Info */}
              <div className="p-3 bg-info/10 border border-info/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-info">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">What happens after delegation</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Eye className="h-3 w-3 flex-shrink-0" />
                    <span>You'll still have full visibility of this correspondence</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="h-3 w-3 flex-shrink-0" />
                    <span>You'll be notified when the assistant takes action</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <RotateCcw className="h-3 w-3 flex-shrink-0" />
                    <span>You can recall the delegation at any time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>Delegation remains active until you recall it or correspondence is completed</span>
                  </li>
                </ul>
              </div>
</>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} aria-label="Cancel delegation">
            Cancel
          </Button>
          {availableAssistants.length > 0 && (
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedAssistant || isSubmitting}
              className="bg-primary"
              aria-label="Delegate to assistant"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Delegating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Delegate
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog - Using separate Dialog to avoid nesting issues */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent size="xl" height="fill">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Confirm Delegation
            </DialogTitle>
            <DialogDescription>
              You are about to delegate this correspondence
            </DialogDescription>
          </DialogHeader>

<ScrollArea className="max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-220px)] pr-4">
            <div className="space-y-3 py-4 p-1 pr-0">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedAssistantData?.userName}</p>
                  <Badge variant={selectedAssistantData?.type === 'PA' ? 'default' : 'secondary'} className="text-xs">
                    {selectedAssistantData?.type === 'PA' ? 'Personal Assistant' : 'Technical Assistant'}
                  </Badge>
                </div>
              </div>
            </div>
            
              {delegationNotes && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Instructions:</p>
                <p className="text-sm text-foreground">{delegationNotes}</p>
              </div>
              )}

            {/* Duration info */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-medium text-foreground">{getDurationDisplayText()}</span>
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              The assistant will be notified and can act on your behalf based on their permissions.
            </p>
          </div>
          </ScrollArea>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-primary hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Delegating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Confirm Delegation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
