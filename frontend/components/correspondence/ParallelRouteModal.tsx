import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Users,
  X,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import type { Correspondence, User } from '@/lib/npa-structure';
import { useOrganization, type Office } from '@/contexts/OrganizationContext';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { apiFetch } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDivisionById,
  getDepartmentById,
  GRADE_LEVELS,
} from '@/lib/npa-structure';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { filterUsersBySearch, getUserPrimaryOffice } from '@/lib/routing-utils';

interface ParallelRouteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Recipient {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  officeId?: string;
  officeName?: string;
  purpose: 'action' | 'information' | 'comment' | 'approval';
  minuteText: string;
}

export const ParallelRouteModal = ({
  correspondence,
  isOpen,
  onClose,
  onSuccess,
}: ParallelRouteModalProps) => {
  const { syncFromApi } = useCorrespondence();
  const { currentUser: activeUser } = useCurrentUser();
  const { users: organizationUsers, offices, officeMemberships, divisions } = useOrganization();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [mergeStrategy, setMergeStrategy] = useState<'all' | 'independent' | 'any' | 'majority'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is executive (MDCS, EDCS, GMCS, AGMCS)
  const isExecutive = useMemo(() => {
    if (!activeUser?.gradeLevel) return false;
    const executiveGrades = ['MDCS', 'EDCS', 'GMCS', 'AGMCS'];
    return executiveGrades.includes(activeUser.gradeLevel);
  }, [activeUser?.gradeLevel]);

  const activeUsers = useMemo(
    () => organizationUsers.filter((user) => user.active !== false),
    [organizationUsers],
  );

  // Get available users (exclude current user and those who already acted)
  const availableUsers = useMemo(() => {
    // Get current user's primary office to check lateral routing permission
    const primaryOfficeMembership = officeMemberships.find(
      (m) => m.userId === activeUser?.id && m.isPrimary && m.isActive,
    );
    const primaryOffice = primaryOfficeMembership
      ? offices.find((o) => o.id === primaryOfficeMembership.officeId)
      : undefined;
    const canRouteLaterally = primaryOffice?.allowLateralRouting ?? true; // Default to true if office not found
    
    // Get grade levels sorted by level (higher level = more authority)
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map(g => g.code);
    const currentGradeIndex = activeUser?.gradeLevel ? gradeOrder.indexOf(activeUser.gradeLevel) : -1;
    
    // Get current user's division and directorate info
    const currentDivisionId = activeUser?.division;
    const currentDivision = currentDivisionId ? getDivisionById(currentDivisionId) : null;
    const currentDirectorateId = currentDivision?.directorateId ?? activeUser?.directorate;
    
    const base = activeUsers.filter((user) => {
      // Exclude current user
      if (user.id === activeUser?.id) return false;
      
      // Standard routing: allow routing within same division/directorate hierarchy
      const userDivision = user.division ? getDivisionById(user.division) : null;
      const userDirectorateId = userDivision?.directorateId ?? user.directorate;
      
      // Check if user belongs to same division or directorate
      const sameDivision = Boolean(currentDivisionId && user.division && currentDivisionId === user.division);
      const sameDirectorate = Boolean(currentDirectorateId && userDirectorateId && currentDirectorateId === userDirectorateId);
      
      // Allow if same division or directorate
      if (sameDivision || sameDirectorate) {
        return true;
      }
      
      // Lateral routing: same grade level peers (if allowed)
      if (canRouteLaterally && user.gradeLevel === activeUser?.gradeLevel) {
        // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
        return true;
      }
      
      // Cross-tier routing: AGM can route to GM (if allowed)
      if (canRouteLaterally && activeUser?.gradeLevel === 'AGMCS' && user.gradeLevel === 'GMCS') {
        return true;
      }
      
      // For executives (MD, ED), allow routing to anyone
      const isExecutive = activeUser?.gradeLevel && ['MDCS', 'EDCS'].includes(activeUser.gradeLevel);
      if (isExecutive) {
        return true;
      }
      
      return false;
    });

    const byDivision =
      selectedDivision === 'all'
        ? base
        : base.filter((user) => user.division === selectedDivision);

    if (!searchQuery.trim()) {
      return byDivision;
    }

    return filterUsersBySearch(byDivision, searchQuery, {
      includeDivision: true,
      includeDepartment: true,
      includeEmail: true,
    });
  }, [activeUsers, activeUser, searchQuery, selectedDivision, officeMemberships, offices]);

  // Get user's primary office
  const getUserOffice = useCallback((userId: string): Office | undefined => {
    return getUserPrimaryOffice(userId, officeMemberships, offices);
  }, [officeMemberships, offices]);

  const addRecipient = (user: User) => {
    if (recipients.some((r) => r.userId === user.id)) {
      toast.info('User already added');
      return;
    }

    const userOffice = getUserOffice(user.id);
    const newRecipient: Recipient = {
      id: `recipient-${Date.now()}-${Math.random()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.systemRole,
      officeId: userOffice?.id,
      officeName: userOffice?.name,
      purpose: 'action',
      minuteText: '',
    };

    setRecipients([...recipients, newRecipient]);
    setSearchQuery('');
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const updateRecipient = (id: string, updates: Partial<Recipient>) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  };

  const handleSubmit = async () => {
    if (recipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    if (recipients.some((r) => !r.minuteText.trim())) {
      setError('All recipients must have minute text');
      return;
    }

    // Validate minute text length
    const invalidRecipients = recipients.filter(
      (r) => r.minuteText.trim().length < MODAL_CONSTANTS.MINUTE_TEXT.MIN ||
             r.minuteText.trim().length > MODAL_CONSTANTS.MINUTE_TEXT.MAX
    );
    if (invalidRecipients.length > 0) {
      setError(`Minute text must be between ${MODAL_CONSTANTS.MINUTE_TEXT.MIN} and ${MODAL_CONSTANTS.MINUTE_TEXT.MAX} characters for all recipients`);
      return;
    }

    if (!isExecutive) {
      setError('Only executives (MD, ED, GM, AGM) can create parallel routes');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch('/correspondence/minutes/parallel-route/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence_id: correspondence.id,
          recipients: recipients.map((r) => ({
            user_id: r.userId,
            purpose: r.purpose,
            office_id: r.officeId,
            minute_text: r.minuteText.trim(),
          })),
          merge_strategy: mergeStrategy,
        }),
      });

      await syncFromApi();
      toast.success(`Parallel route created with ${recipients.length} branch${recipients.length !== 1 ? 'es' : ''}`);
      onSuccess?.();
      onClose();
      setRecipients([]);
      setSearchQuery('');
      setMergeStrategy('all');
    } catch (error: unknown) {
      logError('Failed to create parallel route', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      const errorMessage = ModalErrorHandler.getUserFriendlyMessage(modalError);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setRecipients([]);
      setSearchQuery('');
      setSelectedDivision('all');
      setMergeStrategy('all');
      setError(null);
    }
  }, [isOpen]);

  if (!isExecutive) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Restricted</DialogTitle>
            <DialogDescription>
              Only executives (MD, ED, GM, AGM) can create parallel routes.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>You do not have permission to create parallel routes.</span>
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Send to Multiple Recipients
          </DialogTitle>
          <DialogDescription>
            Send to multiple people at the same time. Each recipient works on their branch independently, saving time for concurrent reviews.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-4 pr-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Merge Strategy */}
            <div className="space-y-2">
              <Label>Merge Strategy *</Label>
              <Select value={mergeStrategy} onValueChange={(v: string) => setMergeStrategy(v as typeof mergeStrategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex flex-col">
                      <span className="font-medium">Wait for All</span>
                      <span className="text-xs text-muted-foreground">
                        All branches must complete before workflow continues
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="independent">
                    <div className="flex flex-col">
                      <span className="font-medium">Independent</span>
                      <span className="text-xs text-muted-foreground">
                        Branches work independently, don't block each other
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="any">
                    <div className="flex flex-col">
                      <span className="font-medium">Any One</span>
                      <span className="text-xs text-muted-foreground">
                        Continue when first branch completes
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="majority">
                    <div className="flex flex-col">
                      <span className="font-medium">Majority</span>
                      <span className="text-xs text-muted-foreground">
                        Continue when majority of branches complete
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Add Recipients */}
            <div className="space-y-2">
              <Label>Add Recipients</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions
                        .filter((d) => d.isActive !== false)
                        .map((division) => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* User List */}
              {availableUsers.length > 0 && (
                <Card>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {availableUsers.slice(0, 20).map((user) => {
                          const division = user.division ? getDivisionById(user.division) : null;
                          return (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                              onClick={() => addRecipient(user)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.systemRole} {division ? `• ${division.name}` : ''}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Selected Recipients */}
            <div className="space-y-2">
              <Label>Selected Recipients ({recipients.length})</Label>
              {recipients.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No recipients added yet. Search and add recipients above.
                </div>
              ) : (
                <div className="space-y-3">
                  {recipients.map((recipient) => (
                    <Card key={recipient.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{recipient.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {recipient.userRole} {recipient.officeName ? `• ${recipient.officeName}` : ''}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecipient(recipient.id)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Purpose</Label>
                            <Select
                              value={recipient.purpose}
                              onValueChange={(v: string) =>
                                updateRecipient(recipient.id, { purpose: v as typeof recipient.purpose })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="action">For Action</SelectItem>
                                <SelectItem value="information">For Information</SelectItem>
                                <SelectItem value="comment">For Comment</SelectItem>
                                <SelectItem value="approval">For Approval</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Minute Text * <span className="text-muted-foreground">({MODAL_CONSTANTS.MINUTE_TEXT.MIN}-{MODAL_CONSTANTS.MINUTE_TEXT.MAX} characters)</span></Label>
                            <Textarea
                              placeholder="Enter minute text for this recipient..."
                              value={recipient.minuteText}
                              onChange={(e) =>
                                updateRecipient(recipient.id, { minuteText: e.target.value })
                              }
                              className="min-h-[80px] text-sm"
                              maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
                              aria-label="Minute text for recipient"
                              aria-required="true"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {recipient.minuteText.length} / {MODAL_CONSTANTS.MINUTE_TEXT.MAX} characters
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel parallel routing">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || recipients.length === 0}
            aria-label={`Create parallel route with ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

