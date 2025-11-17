import { logError } from '@/lib/client-logger';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, generateReferenceNumber, getNextStepNumber } from '@/lib/correspondence-helpers';
import { saveDraft, getDraftByCorrespondence, deleteDraft } from '@/lib/storage';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText,
  Send,
  Save,
  User as UserIcon,
  Building2,
  AlertCircle,
  Search,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { GRADE_LEVELS } from '@/lib/npa-structure';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';

interface TreatmentModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
}

export const TreatmentModal = ({ correspondence, isOpen, onClose }: TreatmentModalProps) => {
  const { addCorrespondence, addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { currentUser: activeUser } = useCurrentUser();
  const { users, divisions, departments } = useOrganization();
  const [currentUser, setCurrentUser] = useState(activeUser ?? null);
  const [memoSubject, setMemoSubject] = useState(`Re: ${correspondence.subject}`);
  const [memoSubjectError, setMemoSubjectError] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoContentError, setMemoContentError] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setCurrentUser(activeUser);
    }
  }, [activeUser]);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const draft = getDraftByCorrespondence(correspondence.id, 'treatment');
    if (draft) {
      setMemoContent(draft.content);
      setCharacterCount(draft.content.length);
      if (draft.subject) setMemoSubject(draft.subject);
      if (draft.forwardTo) setForwardTo(draft.forwardTo);
      if (draft.onBehalfOf) setOnBehalfOf(draft.onBehalfOf);
      setHasDraft(true);
      setDraftId(draft.id);
    } else {
      setHasDraft(false);
      setDraftId(null);
      setMemoSubject(`Re: ${correspondence.subject}`);
      setMemoContent('');
      setForwardTo('');
      setOnBehalfOf('');
      setSearchQuery('');
    }
  }, [isOpen, correspondence.id, currentUser]);

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);

  const findUserById = useCallback(
    (id?: string | null) => (id ? users.find((user) => user.id === id) : undefined),
    [users],
  );

  const getForwardingOptions = () => {
    if (!currentUser) return [];
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
    const currentGradeIndex = gradeOrder.indexOf(currentUser.gradeLevel);
    if (currentGradeIndex === -1) return [];
    const higherGrades = gradeOrder.slice(0, currentGradeIndex);

    const currentDivision = currentUser.division
      ? divisions.find((div) => div.id === currentUser.division)
      : undefined;
    const currentDirectorateId = currentUser.directorate ?? currentDivision?.directorateId;

    const candidates = activeUsers.filter((user) => {
      if (user.id === currentUser.id) return false;

      if (user.systemRole === 'Managing Director' || user.gradeLevel === 'MDCS') {
        return true;
      }

      const targetGradeIndex = gradeOrder.indexOf(user.gradeLevel);
      const isHigherGrade = targetGradeIndex !== -1 && targetGradeIndex < currentGradeIndex;

      if (user.division && currentUser.division && user.division === currentUser.division) {
        return true;
      }

      const userDivision = user.division ? divisions.find((div) => div.id === user.division) : undefined;
      const userDirectorateId = user.directorate ?? userDivision?.directorateId;

      if (currentDirectorateId && userDirectorateId === currentDirectorateId && isHigherGrade) {
        return true;
      }

      if (!user.division && isHigherGrade) {
        return true;
      }

      return false;
    });

    if (candidates.length === 0) {
      return activeUsers;
    }

    return candidates;
  };

  const getBehalfOfOptions = () => {
    if (!currentUser) return [];
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
    const currentGradeIndex = gradeOrder.indexOf(currentUser.gradeLevel);

    if (currentGradeIndex === 0) return [];

    const superiorGrade = gradeOrder[currentGradeIndex - 1];

    return activeUsers.filter(
      (user) => user.gradeLevel === superiorGrade && user.division === currentUser.division,
    );
  };

  const forwardingOptions = useMemo(() => getForwardingOptions(), [activeUsers, currentUser, divisions]);
  const behalfOfOptions = useMemo(() => getBehalfOfOptions(), [activeUsers, currentUser, divisions]);

  const filteredForwardingOptions = useMemo(() => {
    if (!searchQuery.trim()) return forwardingOptions;
    const query = searchQuery.toLowerCase();
    return forwardingOptions.filter((user) => {
      const division = user.division ? divisions.find((div) => div.id === user.division) : undefined;
      const departmentName = user.department ? (departments.find((dept) => dept.id === user.department)?.name ?? '') : '';
      return (
        user.name.toLowerCase().includes(query) ||
        user.systemRole.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.gradeLevel.toLowerCase().includes(query) ||
        (division?.name.toLowerCase().includes(query) ?? false) ||
        (departmentName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [forwardingOptions, searchQuery]);

  const handleContentChange = (text: string) => {
    setMemoContent(text);
    setCharacterCount(text.length);
  };

  const handleSubmit = () => {
    if (!currentUser) {
      toast.error('Current user not found. Cannot perform action.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setShowConfirmation(true);
  };

  const validateForm = (): boolean => {
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');

    const trimmedSubject = memoSubject.trim();
    if (!trimmedSubject) {
      setMemoSubjectError('Memo subject is required');
      return false;
    }

    if (trimmedSubject.length < 5) {
      setMemoSubjectError('Subject must be at least 5 characters long');
      return false;
    }

    const trimmedContent = memoContent.trim();
    if (!trimmedContent) {
      setMemoContentError('Memo content is required');
      return false;
    }

    if (trimmedContent.length < 10) {
      setMemoContentError('Content must be at least 10 characters long');
      return false;
    }

    if (!forwardTo) {
      setForwardToError('Please select a recipient');
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!currentUser) {
      toast.error('Current user not found. Cannot perform action.');
      setShowConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    const recipient = findUserById(forwardTo);
    const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) : null;
    const division = currentUser.division ? divisions.find((div) => div.id === currentUser.division) : undefined;

    try {
      // Create treatment minute via API
      const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
      const nextStep = getNextStepNumber(existingMinutes);

      await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          action_type: 'treat',
          minute_text: `[TREATMENT & RESPONSE]\n\nSubject: ${memoSubject.trim()}\n\n${memoContent.trim()}`,
          direction: 'upward',
          step_number: nextStep,
        }),
      });

      // Update correspondence direction and status via API
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          direction: 'upward',
          current_approver: forwardTo,
          status: 'in-progress',
        }),
      });

      // Create new correspondence (response memo) via API
      await apiFetch('/correspondence/items/', {
        method: 'POST',
        body: JSON.stringify({
          reference_number: generateReferenceNumber(division?.code || 'NPA'),
          subject: memoSubject.trim(),
          source: 'internal',
          received_date: new Date().toISOString(),
          sender_name: actingFor ? `${currentUser.name} (on behalf of ${actingFor.name})` : currentUser.name,
          sender_organization: division?.name ?? '',
          status: 'pending',
          priority: correspondence.priority,
          division: recipient?.division ?? correspondence.divisionId,
          department: recipient?.department ?? correspondence.departmentId,
          current_approver: forwardTo,
          direction: 'upward',
        }),
      });

      await syncFromApi();

      if (draftId) {
        deleteDraft(draftId);
      }

      setShowConfirmation(false);

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          setMemoSubject(`Re: ${correspondence.subject}`);
          setMemoContent('');
          setForwardTo('');
          setOnBehalfOf('');
          setHasDraft(false);
          setDraftId(null);
          setSearchQuery('');
          setMemoSubjectError('');
          setMemoContentError('');
          setForwardToError('');
        }, 100);
      }, 200);

      toast.success('Response sent successfully', {
        description: actingFor
          ? `Sent to ${recipient?.name ?? 'selected user'} on behalf of ${actingFor.name}`
          : `Sent to ${recipient?.name ?? 'selected user'}`,
      });
    } catch (error: any) {
      logError('Failed to process treatment', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.minute_text?.[0] ||
                          error?.response?.data?.subject?.[0] ||
                          error?.message || 
                          'Unable to send response. Please try again.';
      toast.error(errorMessage);
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!currentUser) {
      toast.error('Current user not found. Cannot save draft.');
      return;
    }
    const draft = saveDraft({
      id: draftId || generateId('draft'),
      correspondenceId: correspondence.id,
      type: 'treatment',
      content: memoContent,
      subject: memoSubject,
      forwardTo,
      onBehalfOf: onBehalfOf !== 'none' ? onBehalfOf : undefined,
      timestamp: new Date().toISOString(),
    });

    setHasDraft(true);
    setDraftId(draft.id);

    toast.info('Draft saved', {
      description: 'You can continue editing later',
    });
  };

  if (!currentUser) return null;

  const divisionEntity = currentUser.division
    ? divisions.find((division) => division.id === currentUser.division) ?? null
    : null;
  const selectedRecipient = forwardTo ? findUserById(forwardTo) ?? null : null;
  const actingFor = onBehalfOf ? findUserById(onBehalfOf) ?? null : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Treat & Respond
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Draft Loaded
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Compose a formal response memo to this correspondence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">Original: {correspondence.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>Ref: {correspondence.referenceNumber}</span>
                    <span>•</span>
                    <span>From: {correspondence.senderName}</span>
                    <span>•</span>
                    <span>{divisionEntity?.name}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    correspondence.priority === 'urgent'
                      ? 'destructive'
                      : correspondence.priority === 'high'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {correspondence.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {behalfOfOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="behalfOf" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Acting on behalf of (optional)
              </Label>
              <Select value={onBehalfOf} onValueChange={setOnBehalfOf}>
                <SelectTrigger>
                  <SelectValue placeholder="Select if acting for someone" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="none">None - Acting for myself</SelectItem>
                  <Separator className="my-1" />
                  {behalfOfOptions.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.systemRole} - {user.gradeLevel}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onBehalfOf && onBehalfOf !== 'none' && (
                <Card className="bg-info/5 border-info/20">
                  <CardContent className="p-3">
                    <p className="text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-info" />
                      You are acting on behalf of <strong>{actingFor?.name}</strong> ({actingFor?.systemRole})
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">
              Memo Subject * <span className="text-muted-foreground text-xs font-normal">(5+ characters)</span>
            </Label>
            <Input
              id="subject"
              value={memoSubject}
              onChange={(e) => {
                setMemoSubject(e.target.value);
                if (memoSubjectError) setMemoSubjectError('');
              }}
              placeholder="Re: Subject of response"
              className={`font-medium ${memoSubjectError ? 'border-destructive' : ''}`}
              aria-label="Memo subject"
              aria-required="true"
              aria-invalid={!!memoSubjectError}
              aria-describedby={memoSubjectError ? "subject-error" : "subject-help"}
            />
            {memoSubjectError && (
              <p id="subject-error" className="text-xs text-destructive" role="alert">
                {memoSubjectError}
              </p>
            )}
            <p id="subject-help" className="text-xs text-muted-foreground">
              Enter a clear subject line for the response memo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Memo Content * <span className="text-muted-foreground text-xs font-normal">(10+ characters)</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Compose your response memo here..."
              value={memoContent}
              onChange={(e) => {
                handleContentChange(e.target.value);
                if (memoContentError) setMemoContentError('');
              }}
              className={`min-h-[180px] resize-none ${memoContentError ? 'border-destructive' : ''}`}
              aria-label="Memo content"
              aria-required="true"
              aria-invalid={!!memoContentError}
              aria-describedby={memoContentError ? "content-error" : "content-help"}
            />
            <div className="flex justify-between items-center">
              <div>
                {memoContentError && (
                  <p id="content-error" className="text-xs text-destructive" role="alert">
                    {memoContentError}
                  </p>
                )}
                <p id="content-help" className="text-xs text-muted-foreground">
                  Markdown supported
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{characterCount} characters</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forwardTo">Forward To *</Label>
            <Select 
              value={forwardTo} 
              onValueChange={(value) => {
                setForwardTo(value);
                if (forwardToError) setForwardToError('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search name, role, division..."
                      className="pl-8 h-9"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                </div>
                {filteredForwardingOptions.length > 0 ? (
                  filteredForwardingOptions.map((user) => {
                    const userDivision = user.division ? divisions.find((div) => div.id === user.division) : undefined;
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.systemRole} {userDivision ? `- ${userDivision.name}` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-users" disabled>
                    No suitable recipients found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {forwardToError && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {forwardToError}
              </p>
            )}
            {selectedRecipient && !forwardToError && (
              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Will be sent to: {selectedRecipient.name}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            aria-label="Save draft"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-gradient-primary"
            aria-label="Send response"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => !isSubmitting && setShowConfirmation(false)}
        onConfirm={handleConfirm}
        type="treatment"
        data={{
          currentUserName: currentUser.name,
          recipientName: selectedRecipient?.name || '',
          subject: memoSubject,
          content: memoContent,
          onBehalfOf: actingFor?.name,
          direction: 'upward',
        }}
        disabled={isSubmitting}
      />
    </Dialog>
  );
};