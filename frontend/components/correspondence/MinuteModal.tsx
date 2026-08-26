"use client";
import { ERROR_UNKNOWN } from '@/lib/constants';

import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAbortController } from '@/hooks/use-abort-controller';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, getNextStepNumber } from '@/lib/correspondence-helpers';
import {
  saveDraft,
  getDraftByCorrespondence,
  deleteDraft,
} from '@/lib/storage';
import type { Minute } from '@/lib/npa-structure';


import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from "@/components/ui/sonner";
import { formatDateShort, formatDateTime } from "@/lib/datetime";
import { ensureSealImageCached } from "@/lib/seal-cache";
import {
  MessageSquare,
  Send,
  Save,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';
import { 
  getDivisionById,
  getDepartmentById,
  getDirectorateById,
  type Correspondence,
  type DistributionRecipient,
  type User,
} from '@/lib/npa-structure';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { getSuggestedApprovers, filterUsersBySearch } from '@/lib/routing-utils';
import { DistributionSelector } from './DistributionSelector';
import { RoutingSection } from './RoutingSection';
import { type SignatureTemplate } from '@/lib/api/signatures';
import { useSignature } from '@/hooks/use-signature';
import {
  getTemplatesForUser,
  createTemplate as createDocumentTemplate,
  type DocumentTemplate,
} from '@/lib/api/document-templates';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganization, type AssistantAssignment } from '@/contexts/OrganizationContext';
import { useOrgUsers } from "@/hooks/use-org-users";
import { apiFetch } from '@/lib/api-client';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { TwoFactorVerificationModal } from '@/components/seals/TwoFactorVerificationModal';
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchSLATargets, DEFAULT_SLA_TARGETS, type SLATargets } from '@/lib/sla-client';
import React from 'react';

interface MinuteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
  direction: 'downward' | 'upward' | 'lateral';
}

const MinuteModalComponent = ({ correspondence, isOpen, onClose, direction: initialDirection }: MinuteModalProps) => {
  const {addMinute: _addMinute, updateCorrespondence: _updateCorrespondence, getMinutesByCorrespondenceId } = useCorrespondence();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [minuteText, setMinuteText] = useState('');
  const [minuteTextError, setMinuteTextError] = useState('');
  const [actionType, setActionType] = useState<'minute' | 'approve'>('minute');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionRecipient[]>([]);
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<'upward' | 'downward' | 'lateral'>(initialDirection);
  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 2FA state for executive approvals
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAVerificationToken, setTwoFAVerificationToken] = useState<string | null>(null);
  const [applySignature, setApplySignature] = useState(false);
  const [applySignatureManuallySet, setApplySignatureManuallySet] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  // Request cancellation
  const { getSignal, reset } = useAbortController();
  const submittingRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
const [minuteTemplates, setMinuteTemplates] = useState<DocumentTemplate[]>([]);
const [newTemplateName, setNewTemplateName] = useState('');
const [_templateSectionOpen, _setTemplateSectionOpen] = useState(false);
  const [slaTargets, setSlaTargets] = useState<SLATargets | null>(null);
  const { currentUser: activeUser } = useCurrentUser();
  const { assistantAssignments, offices, officeMemberships, directorates, divisions } = useOrganization();
  const { users: organizationUsers } = useOrgUsers();
  
  // Use shared signature hook (after activeUser is available)
  const { signature: userSignature, templates: signatureTemplates, preferences: userSignaturePreferences, isLoading: isSignatureLoading } = useSignature({
    userId: activeUser?.id,
    autoLoad: isOpen,
  });

  const activeDirectoryUsers = useMemo(
    () => organizationUsers.filter((user) => user.active !== false),
    [organizationUsers],
  );

  const assistantTeam = useMemo(() => {
    if (!currentUser) return [];
    return assistantAssignments
      .filter((assignment) => assignment.executiveId === currentUser.id)
      .map((assignment) => {
        const assistant = activeDirectoryUsers.find((user) => user.id === assignment.assistantId);
        if (!assistant) {
          return null;
        }
        return { assignment, assistant } as { assignment: AssistantAssignment; assistant: User };
      })
      .filter((entry): entry is { assignment: AssistantAssignment; assistant: User } => entry !== null);
  }, [assistantAssignments, activeDirectoryUsers, currentUser]);

  const assistantAssignmentsById = useMemo(() => {
    const map = new Map<string, AssistantAssignment>();
    assistantTeam.forEach(({ assignment, assistant }) => {
      map.set(assistant.id, assignment);
    });
    return map;
  }, [assistantTeam]);

  const assistantCandidates = useMemo(
    () =>
      assistantTeam
        .filter(({ assignment }) => assignment.permissions.includes('forward') || assignment.permissions.includes('draft') || assignment.permissions.includes('coordinate'))
        .map(({ assistant }) => assistant),
    [assistantTeam],
  );

  const findUserById = useCallback(
    (id: string) => activeDirectoryUsers.find((user) => user.id === id),
    [activeDirectoryUsers],
  );

  // Get user's primary office and division info
  const getUserOfficeInfo = useCallback((userId: string) => {
    const membership = officeMemberships.find(
      (m) => m.userId === userId && m.isPrimary && m.isActive
    );
    if (!membership) return null;
    const office = offices.find(o => o.id === membership.officeId);
    const user = findUserById(userId);
    const division = user?.division ? getDivisionById(user.division) : null;
    const directorate = division?.directorateId ? getDirectorateById(division.directorateId) : null;
    return { office, division, directorate };
  }, [officeMemberships, offices, findUserById]);

  // RoutingSection expects a narrower shape
  const getUserOfficeInfoForRouting = useCallback(
    (userId: string): { office?: { name: string }; division?: { name: string } } | null => {
      const info = getUserOfficeInfo(userId);
      if (!info) return null;
      return {
        office: info.office ? { name: info.office.name } : undefined,
        division: info.division ? { name: info.division.name } : undefined,
      };
    },
    [getUserOfficeInfo],
  );

  const activeOffices = useMemo(() => offices.filter((office) => office.isActive), [offices]);
  const officeOptions = useMemo(
    () => activeOffices.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [activeOffices],
  );
  const officeOptionsForRouting = useMemo(
    () =>
      officeOptions.map((o) => ({
        id: o.id,
        name: o.name,
        officeType: o.officeType ?? undefined,
        directorateId: o.directorateId ?? undefined,
        divisionId: o.divisionId ?? undefined,
      })),
    [officeOptions],
  );

  const primaryOfficeMembership = useMemo(
    () =>
      currentUser
        ? officeMemberships.find(
            (membership) => membership.userId === currentUser.id && membership.isPrimary && membership.isActive,
          )
        : undefined,
    [officeMemberships, currentUser],
  );

  // Fetch SLA targets on mount
  useEffect(() => {
    if (isOpen) {
      fetchSLATargets()
        .then(setSlaTargets)
        .catch(() => {
          // Use defaults if fetch fails
          setSlaTargets(DEFAULT_SLA_TARGETS);
        });
    }
  }, [isOpen]);

  // Autosave draft after 5s of inactivity
  useEffect(() => {
    if (!isOpen) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!minuteText.trim()) return;
      const silentSave = async () => {
        try {
          const draftData = {
            correspondenceId: correspondence.id,
            type: 'minute' as const,
            content: minuteText,
            forwardTo,
            actionType: actionType as 'minute' | 'approve',
          };
          await saveDraft(draftData);
        } catch {
          // Silent — autosave failures are non-critical
        }
      };
      silentSave();
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, minuteText, forwardTo, actionType, purpose, applySignature, selectedTemplateId]);

  // Helper to get SLA days for a priority
  const getSLADays = useCallback((priority: string): number | null => {
    if (!slaTargets) return null;
    switch (priority) {
      case 'urgent': return slaTargets.urgent;
      case 'high': return slaTargets.high;
      case 'medium': return slaTargets.medium;
      case 'low': return slaTargets.low;
      default: return null;
    }
  }, [slaTargets]);

  useEffect(() => {
    if (!isOpen) return;
    const fallbackOfficeId =
      correspondence.currentOfficeId ??
      correspondence.owningOfficeId ??
      primaryOfficeMembership?.officeId ??
      '';
    setTargetOfficeId(fallbackOfficeId);
  }, [
    isOpen,
    correspondence.id,
    correspondence.currentOfficeId,
    correspondence.owningOfficeId,
    primaryOfficeMembership?.officeId,
  ]);
 
  // Templates are now loaded from backend - no initialization needed

  const refreshMinuteTemplates = useCallback(
    async (userArg?: User) => {
      const targetUser = userArg ?? currentUser;
      if (!targetUser) {
        setMinuteTemplates([]);
        return;
      }
      try {
        const templates = await getTemplatesForUser(targetUser, 'minute');
        setMinuteTemplates(templates);
      } catch (error: unknown) {
        logError('Failed to load minute templates', error);
        setMinuteTemplates([]);
      }
    },
    [currentUser],
  );

  const getTemplatePlainText = (template: DocumentTemplate) => {
    if (template.contentText && template.contentText.trim().length > 0) {
      return template.contentText.trim();
    }
    if (!template.contentHtml) return '';
    return template.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const convertTextToHtml = (text: string) => {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return `<p>${text.trim()}</p>`;
    }

    return paragraphs
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
      .join('\n');
  };
  
  useEffect(() => {
    const selectedUser = activeUser ?? organizationUsers.find((user) => user.active) ?? null;
    if (!isOpen || !selectedUser) return;
    setCurrentUser(selectedUser);
    refreshMinuteTemplates(selectedUser).catch((error) => {
      logError('Failed to refresh templates', error);
    });
  }, [isOpen, activeUser, organizationUsers, refreshMinuteTemplates]);

  // Check if user is management level (MDCS, EDCS, MSS1, MSS2, MSS3)
  const userPermissions = useUserPermissions(currentUser ?? undefined);
  const canDistribute = userPermissions.canDistribute;
  
  // Check if user is MD (highest level - can only send downward)
  const isMD = currentUser?.gradeLevel === 'MDCS' || currentUser?.systemRole === 'Managing Director';
  
  // Other users (below MD) can choose direction
  const canChooseDirection = !isMD;

  // Unified approval gate: permission + scope + turn/delegation/CC
  const hasCanApprovePerm = Boolean(userPermissions.canApprove || currentUser?.rolePermissions?.can_approve);
  const isCurrentTurn = correspondence.currentApproverId ? String(correspondence.currentApproverId) === String(currentUser?.id) : false;
  const myOfficeIds = useMemo(() => officeMemberships.filter(m => m.userId === currentUser?.id && m.isActive).map(m => m.officeId), [officeMemberships, currentUser?.id]);
  const explicitCC = useMemo(() => {
    if (!currentUser || !correspondence.distribution) return false;
    return correspondence.distribution.some((d) => {
      if (d.type === 'user' && d.userId === currentUser.id) return true;
      if (d.type === 'office' && d.officeId && myOfficeIds.includes(d.officeId)) return true;
      return false;
    });
  }, [correspondence.distribution, currentUser, myOfficeIds]);
  // Delegation is per-correspondence; parent page tracks backendDelegation – approximate as false here; CC/turn covers main cases and backend is truth
  const isDelegatee = false;
  const scopeOk = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.isSuperuser) return true;
    if (currentUser.systemRole === 'Super Admin') return true;
    // If correspondence has no division/department, treat as in-scope
    if (!correspondence.divisionId && !correspondence.departmentId) return true;
    // Direct match
    if (correspondence.divisionId && correspondence.divisionId === currentUser.division) return true;
    if (correspondence.departmentId && correspondence.departmentId === currentUser.department) return true;
    // MD sees all
    if (isMD) return true;
    // For other executive grades, allow if user shares directorate? fallback: check directorate via divisions
    if (currentUser.directorate) {
      const corrDivision = divisions.find((d) => d.id === correspondence.divisionId);
      if (corrDivision && corrDivision.directorateId === currentUser.directorate) return true;
    }
    return false;
  }, [currentUser, correspondence.divisionId, correspondence.departmentId, isMD, divisions]);
  const canApprove = hasCanApprovePerm && scopeOk && (isCurrentTurn || isDelegatee || explicitCC);

  // Reset action type to 'minute' if user cannot approve (but keep approve if they are CC/delegatee)
  useEffect(() => {
    if (!canApprove && actionType === 'approve') {
      setActionType('minute');
    }
  }, [canApprove, actionType]);

  // Check if user is an executive (for seal preview)
  const executiveGrades = ['MDCS', 'EDCS']; // Managing Director, Executive Director
  const isExecutive = currentUser && executiveGrades.includes(currentUser.gradeLevel);

  useEffect(() => {
    if (isOpen) {
      refreshMinuteTemplates(currentUser ?? undefined).catch((error) => {
        logError('Failed to refresh templates', error);
      });

      // Load draft if exists
      getDraftByCorrespondence(correspondence.id, 'minute').then((draft) => {
        if (draft) {
          setMinuteText(draft.content);
          if (draft.forwardTo) setForwardTo(draft.forwardTo);
          if (draft.actionType) setActionType(draft.actionType as 'minute' | 'approve');
          setHasDraft(true);
          setDraftId(draft.id);
        } else {
          setHasDraft(false);
          setDraftId(null);
          setMinuteText('');
          setForwardTo('');
          setTargetOfficeId('');
          setRouteType('person');
          setSelectedDirection(initialDirection);
          setPersonSearchQuery('');
          setOfficeSearchQuery('');
          setOfficeFilterDirectorate('all');
          setOfficeFilterDivision('all');
          setActionType('minute');
          setApplySignature(false);
          setNewTemplateName('');
        }
      }).catch((error) => {
        logError('Failed to load draft', error);
      });
    }
  }, [isOpen, correspondence.id, initialDirection, refreshMinuteTemplates, currentUser]);

  // Signature loading is now handled by useSignature hook

  // Cleanup: Cancel ongoing requests when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (typeof document !== "undefined") {
        try {
          document.body.style.removeProperty('pointer-events');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
          document.documentElement.style.removeProperty('overflow');
          document.body.removeAttribute('data-scroll-locked');
          document.body.removeAttribute('data-radix-scroll-lock');
        } catch {
          // ignore
        }
      }
      // Cancel any ongoing requests
      reset()
    }
    return () => {
      // Cleanup on unmount
      if (typeof document !== "undefined") {
        try {
          document.body.style.removeProperty('pointer-events');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
          document.documentElement.style.removeProperty('overflow');
          document.body.removeAttribute('data-scroll-locked');
          document.body.removeAttribute('data-radix-scroll-lock');
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    refreshMinuteTemplates().catch((error) => {
      logError('Failed to refresh templates', error);
    });
  }, [isOpen, refreshMinuteTemplates]);

  useEffect(() => {
    // Only auto-apply signature for executive approvals
    if (actionType === 'approve') {
      if (!userSignature) {
        setApplySignature(false);
        setApplySignatureManuallySet(false);
        return;
      }
      // For executive approvals, always apply signature (required for digital seal)
      if (isExecutive && !applySignatureManuallySet) {
        setApplySignature(true);
        setApplySignatureManuallySet(false);
      }
    } else {
      // For regular minutes, no signature needed
      setApplySignature(false);
      setApplySignatureManuallySet(false);
    }
  }, [actionType, isExecutive, userSignature, applySignatureManuallySet]);

  useEffect(() => {
    setApplySignatureManuallySet(false);
  }, [actionType]);

  // Signature templates are now loaded by useSignature hook

  useEffect(() => {
    const templateType = actionType === 'approve' ? 'approval' : 'minute';
    const available = signatureTemplates.filter(template => template.templateType === templateType);
    if (available.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    const preferredOverride = userSignaturePreferences.templateOverrides?.[templateType];
    if (preferredOverride && available.some(template => template.id === preferredOverride)) {
      setSelectedTemplateId(preferredOverride);
      return;
    }

    setSelectedTemplateId(prev => {
      if (prev && available.some(template => template.id === prev)) {
        return prev;
      }
      const defaultTemplate = available.find(template => template.defaultApply) ?? available[0] ?? null;
      return defaultTemplate ? defaultTemplate.id : null;
    });
  }, [actionType, signatureTemplates, userSignaturePreferences]);

  // Signature preferences are now loaded by useSignature hook

  useEffect(() => {
    if (!isOpen) {
      setApplySignatureManuallySet(false);
    }
  }, [isOpen]);

  const filteredMinuteTemplates = useMemo(
    () =>
      minuteTemplates.filter((template) => {
        const templateAction = template.actionType ?? 'any';
        return templateAction === 'any' || templateAction === actionType;
      }),
    [minuteTemplates, actionType],
  );

  const existingMinutes = useMemo(
    () => getMinutesByCorrespondenceId(correspondence.id),
    [correspondence.id, getMinutesByCorrespondenceId],
  );



  // Get previous minute
  const previousMinute = useMemo(() => {
    const active = existingMinutes.filter(m => !m.isRecalled && !m.recalledAt);
    return active
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [existingMinutes]);

  const previousUser = previousMinute ? findUserById(previousMinute.userId) : null;

  // Get users who have already acted (to exclude from suggestions)
  const usersWhoAlreadyActed = useMemo(() => {
    const acted = new Set(
      existingMinutes
        .filter(minute => !minute.isRecalled)
        .map(minute => minute.userId)
        .filter(Boolean)
    );
    
    if (correspondence.currentApproverId) {
      const currentApproverMinutes = existingMinutes.filter(m => m.userId === correspondence.currentApproverId);
      const hasNonRecalledMinute = currentApproverMinutes.some(m => !m.isRecalled);
      if (hasNonRecalledMinute) {
        acted.add(correspondence.currentApproverId);
      }
    }
    
    return acted;
  }, [existingMinutes, correspondence.currentApproverId]);

  // Get suggested next approvers based on hierarchy and organizational structure
  const suggestedApprovers = useMemo(() => {
    if (!currentUser) return [];
    
    const dir = isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection);
    
    return getSuggestedApprovers({
      currentUser,
      direction: dir,
      correspondence,
      existingMinutes,
      offices,
      officeMemberships,
      activeUsers: activeDirectoryUsers,
      excludeUsers: usersWhoAlreadyActed,
    });
  }, [currentUser, isMD, canChooseDirection, selectedDirection, initialDirection, correspondence, existingMinutes, offices, officeMemberships, activeDirectoryUsers, usersWhoAlreadyActed]);
  
  const suggestedNext = suggestedApprovers[0]; // Immediate next in hierarchy
  
  const assistantIds = useMemo(() => new Set(assistantCandidates.map((user) => user.id)), [assistantCandidates]);
  const baseApproversWithoutAssistants = useMemo(
    () => suggestedApprovers.filter((user) => !assistantIds.has(user.id)),
    [suggestedApprovers, assistantIds],
  );

  const filteredAssistants = useMemo(
    () => filterUsersBySearch(assistantCandidates, personSearchQuery, { includeDivision: true, includeDepartment: true, includeEmail: true }),
    [assistantCandidates, personSearchQuery]
  );
  const filteredApprovers = useMemo(
    () => filterUsersBySearch(baseApproversWithoutAssistants, personSearchQuery, { includeDivision: true, includeDepartment: true, includeEmail: true }),
    [baseApproversWithoutAssistants, personSearchQuery]
  );
  const filteredNext = filteredApprovers[0] ?? filteredAssistants[0] ?? null;
  const nextIsAssistant = filteredNext ? assistantAssignmentsById.has(filteredNext.id) : false;
  const approverList = !personSearchQuery.trim() && filteredNext && !nextIsAssistant && filteredApprovers.length > 0 && filteredApprovers[0].id === filteredNext.id
    ? filteredApprovers.slice(1)
    : filteredApprovers;
  const assistantList = !personSearchQuery.trim() && filteredNext && nextIsAssistant
    ? filteredAssistants.filter((user, index) => !(index === 0 && user.id === filteredNext.id))
    : filteredAssistants;

  const handleTextChange = (text: string) => {
    setMinuteText(text);
  };

  const handleSaveMinuteTemplate = async () => {
    if (!currentUser) {
      toast.error('Select a user context before saving templates.');
      return;
    }

    const content = minuteText.trim();
    if (!content) {
      toast.error('Write your minute before saving it as a template.');
      return;
    }

    const resolvedName = (newTemplateName || content.split('\n')[0]).trim();
    if (!resolvedName) {
      toast.error('Provide a name for the template.');
      return;
    }

    const contentHtml = convertTextToHtml(content);
    try {
      const created = await createDocumentTemplate({
        scope: 'user',
        scopeId: currentUser.id,
        title: resolvedName.slice(0, 80),
        description: actionType === 'approve' ? 'Approval minute template' : 'Minute template',
        contentHtml,
        contentText: content,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        isDefault: false,
        templateType: 'minute',
        actionType,
      });
      await refreshMinuteTemplates();
      setNewTemplateName('');
      toast.success('Template saved for quick reuse.');
    } catch (error: unknown) {
      logError('Failed to save template', error);
      toast.error('Failed to save template. Please try again.');
    }
  };

  const validateForm = (): boolean => {
    setMinuteTextError('');
    setForwardToError('');

    const trimmedMinuteText = minuteText.trim();
    if (!trimmedMinuteText) {
      setMinuteTextError('Please enter your minute');
      return false;
    }

    if (trimmedMinuteText.length < MODAL_CONSTANTS.MINUTE_TEXT.MIN) {
      setMinuteTextError(`Minute text must be at least ${MODAL_CONSTANTS.MINUTE_TEXT.MIN} characters long`);
      return false;
    }

    if (trimmedMinuteText.length > MODAL_CONSTANTS.MINUTE_TEXT.MAX) {
      setMinuteTextError(`Minute text must not exceed ${MODAL_CONSTANTS.MINUTE_TEXT.MAX} characters`);
      return false;
    }

    // Must select either a person OR an office
    if (!forwardTo && !targetOfficeId) {
      setForwardToError('Please select a person or office to forward to');
      return false;
    }

    // Prevent routing to users who have already acted on this correspondence
    if (forwardTo && usersWhoAlreadyActed.has(forwardTo)) {
      setForwardToError('This user has already acted on this correspondence. Please select a different recipient.');
      return false;
    }

    // Only require signature for approvals; seal for EXECUTIVE only (MD)
    if (actionType === 'approve') {
      if (!userSignature) {
        toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
        return false;
      }
      const required = (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
      const isExecTrack = required === 'executive';
      // For MD executive approvals, signature/seal is mandatory
      if (isMD && isExecTrack && !applySignature) {
        toast.error('Digital seal is required for executive approvals. Please enable signature application.');
        return false;
      }
      if (applySignature) {
        const availableTemplates = relevantTemplates;
        if (availableTemplates.length > 0 && !selectedTemplateId) {
          toast.error('Please select a signature template.');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // 2FA/seal only for EXECUTIVE (MD) – endorsement and departmental do not require 2FA
    const required = (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
    const isExecMD = actionType === 'approve' && isMD && required === 'executive' && Boolean(userSignature);
    const requiresTwoFA = isExecMD;
    
    if (requiresTwoFA && !twoFAVerificationToken) {
      // Show 2FA modal for executive approvals
      setShow2FAModal(true);
      return;
    }
    
    setShowConfirmation(true);
  };

  // Handler for successful 2FA verification
  const handle2FAVerified = (token: string) => {
    setTwoFAVerificationToken(token);
    setShow2FAModal(false);
    // Proceed to confirmation after 2FA
    setShowConfirmation(true);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: () => {
        if (isOpen && !showConfirmation && !show2FAModal) {
          onClose();
        }
      },
      description: 'Close modal',
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        if (isOpen && !showConfirmation) {
          handleSaveDraft();
        }
      },
      description: 'Save draft (Ctrl+S)',
      preventDefault: true,
    },
  ]);

  const handleConfirm = async () => {
    if (!currentUser) {
      toast.error('Current user not found. Cannot perform action.');
      setShowConfirmation(false);
      return;
    }

    if (actionType === 'approve' && !userSignature) {
      toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
      setShowConfirmation(false);
      return;
    }

    if (applySignature && !userSignature) {
      toast.error('Signature not found. Upload your signature or disable signature application.');
      setShowConfirmation(false);
      return;
    }

    const forwardUser = findUserById(forwardTo);
    const nextStep = getNextStepNumber(existingMinutes);

    // MD can only send downward, others use selected direction or initial
    const finalDirection = isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection);
    
    // Automatically determine recipient's office from their office memberships
    const recipientOfficeMembership = officeMemberships.find(
      (membership) => membership.userId === forwardTo && membership.isActive && membership.isPrimary
    );
    const recipientOfficeId = recipientOfficeMembership?.officeId || targetOfficeId || undefined;
    
    // Validate that selected user is in the target office (if office is specified)
    if (targetOfficeId && forwardTo) {
      const userInOffice = officeMemberships.some(
        (membership) => membership.userId === forwardTo && 
                       membership.officeId === targetOfficeId && 
                       membership.isActive
      );
      
      if (!userInOffice && recipientOfficeId !== targetOfficeId) {
        const forwardUser = findUserById(forwardTo);
        const targetOffice = offices.find(o => o.id === targetOfficeId);
        toast.error(
          `User ${forwardUser?.name || 'selected'} is not a member of ${targetOffice?.name || 'the selected office'}. Please select a user from that office.`,
          { duration: 5000 }
        );
        setShowConfirmation(false);
        return;
      }
    }
    
    // Get current user's office for from_office
    const currentUserOfficeMembership = officeMemberships.find(
      (membership) => membership.userId === currentUser.id && membership.isActive && membership.isPrimary
    );
    const currentUserOfficeId = currentUserOfficeMembership?.officeId || correspondence.currentOfficeId || undefined;

    const templateForSignature = applySignature
      ? (selectedTemplateId
          ? signatureTemplates.find(t => t.id === selectedTemplateId)
          : relevantTemplates.find(t => t.defaultApply) ?? relevantTemplates[0])
      : undefined;

    const context = getTemplateContext();
    const renderedTemplateText = templateForSignature ? renderTemplateText(templateForSignature, context) : undefined;

    const signaturePayload = applySignature && userSignature ? {
      imageData: userSignature.imageData,
      appliedAt: new Date().toISOString(),
      fileName: userSignature.fileName,
      templateId: templateForSignature?.id,
      templateType: templateForSignature?.templateType,
      renderedText: renderedTemplateText,
    } : undefined;

    const existingDistribution = correspondence.distribution ?? [];
    let distributionWithAddedBy: DistributionRecipient[] = [];

    logInfo('[MinuteModal] Distribution state', {
      distribution,
      canDistribute,
      existingDistribution,
      distributionLength: distribution.length,
    });

    if (canDistribute && distribution.length > 0) {
      distributionWithAddedBy = distribution.map((recipient) => ({
        ...recipient,
        addedById: recipient.addedById ?? currentUser.id,
        addedByName: recipient.addedByName ?? currentUser.name,
        addedAt: recipient.addedAt ?? new Date().toISOString(),
      }));
      
      logInfo('[MinuteModal] Distribution with added by', distributionWithAddedBy);
    }

    const newMinute: Minute = {
      id: generateId('min'),
      correspondenceId: correspondence.id,
      userId: currentUser.id,
      gradeLevel: currentUser.gradeLevel,
      actionType,
      minuteText,
      direction: finalDirection,
      stepNumber: nextStep,
      timestamp: new Date().toISOString(),
      actedBySecretary: false,
      actedByAssistant: false,
      signature: signaturePayload,
    };
    if (targetOfficeId) {
      newMinute.toOfficeId = targetOfficeId;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    // Create AbortController for request cancellation
    const signal = getSignal();
    
    try {
      const existingKeys = new Set(
        existingDistribution.map((entry) => {
          if (entry.type === 'user') {
            return `user:${entry.userId ?? entry.id}`;
          }
          if (entry.type === 'office') {
            return `office:${entry.officeId ?? entry.id}`;
          }
          const targetId =
            entry.type === 'directorate'
              ? entry.directorateId ?? entry.id
              : entry.type === 'division'
              ? entry.divisionId ?? entry.id
              : entry.departmentId ?? entry.id;
          return `${entry.type}:${targetId}`;
        }),
      );
      const newDistributionEntries = distributionWithAddedBy.filter((entry) => {
        let key: string;
        if (entry.type === 'user') {
          key = `user:${entry.userId ?? entry.id}`;
        } else if (entry.type === 'office') {
          key = `office:${entry.officeId ?? entry.id}`;
        } else {
          const targetId =
            entry.type === 'directorate'
              ? entry.directorateId ?? entry.id
              : entry.type === 'division'
              ? entry.divisionId ?? entry.id
              : entry.departmentId ?? entry.id;
          key = `${entry.type}:${targetId}`;
        }
        const isNew = !existingKeys.has(key);
        if (!isNew) {
          logInfo('[MinuteModal] Skipping existing distribution entry', { key });
        }
        return isNew;
      });
      
      logInfo('[MinuteModal] New distribution entries to create', {
        newDistributionEntries,
        count: newDistributionEntries.length,
      });

      // Create minute via API
      const minuteResponse = await apiFetch<Record<string, unknown>>('/correspondence/minutes/', {
        signal,
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          action_type: actionType,
          minute_text: minuteText.trim(),
          direction: finalDirection,
          step_number: nextStep,
          from_office_id: currentUserOfficeId || undefined,
          to_office_id: recipientOfficeId || targetOfficeId || undefined,  // Use recipient's office or explicitly selected office
          to_user_id: forwardTo,  // Always set to_user when user is selected
          signature_payload: signaturePayload || undefined,
          purpose: purpose,
          requires_response: purpose === 'action' || purpose === 'approval',
        }),
      });
      
      const createdMinuteId = minuteResponse?.id;

      if (actionType === "approve") {
        const sealData = (minuteResponse?.seal_data as Record<string, unknown>) || null;
        const serialNumber = sealData ? (sealData.serial_number as string) : "";
        if (serialNumber) {
          void ensureSealImageCached({
            serialNumber,
            officeName: (sealData?.office_name as string) || "",
            officeTitle: (sealData?.office_title as string) || "",
            sealedBy: (sealData?.sealed_by as string) || "",
            sealedAt: (sealData?.sealed_at as string) || "",
            signatureImageUrl: (sealData?.signature_image_url as string | undefined) ?? undefined,
            existingSealImageUrl: (sealData?.seal_image_url as string | undefined) ?? undefined,
          });
        } else {
          logWarn('[MinuteModal] No seal_data in create response — seal may not have been generated');
        }
      }
      
      logInfo('[MinuteModal] Minute created', {
        minuteId: createdMinuteId,
        distributionEntriesToCreate: newDistributionEntries.length,
      });

      // Update correspondence via API
      // Prevent setting current_approver to the current user
      if (forwardTo === currentUser.id) {
        toast.error('Cannot route correspondence to yourself. Please select a different recipient.');
        setShowConfirmation(false);
        setIsSubmitting(false);
        return;
      }
      
      const correspondenceUpdatePayload: Record<string, unknown> = {
        status: 'in-progress',
        direction: finalDirection,
      };
      // Only set current_approver_id if a specific user was selected
      // When routing to an office, the backend determines the correct recipient
      if (forwardTo) {
        correspondenceUpdatePayload.current_approver_id = forwardTo;
      }
      // Always update the office to the recipient's office (or explicitly selected office)
      // Note: Backend also handles this automatically, but we update here for immediate UI feedback
      const finalOfficeId = recipientOfficeId || targetOfficeId;
      if (finalOfficeId) {
        correspondenceUpdatePayload.current_office = finalOfficeId;
      }
      // Update correspondence - this is critical for routing
      const updateResponse = await apiFetch<Record<string, unknown>>(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(correspondenceUpdatePayload),
        signal,
      });
      
      // Verify the update was successful
      const expectedOfficeId = recipientOfficeId || targetOfficeId;
      if (!updateResponse) {
        logWarn('Correspondence update failed - no response received');
      } else {
        const actualApproverId = updateResponse.current_approver_id || updateResponse.current_approver;
        const actualOfficeId = updateResponse.current_office_id || updateResponse.current_office;
        
        if (actualApproverId !== forwardTo) {
          logWarn('Correspondence update may not have applied correctly', { actualApproverId, expected: forwardTo });
        }
        
        if (expectedOfficeId && actualOfficeId !== expectedOfficeId) {
          logWarn('Correspondence office may not have been set correctly', { actualOfficeId, expected: expectedOfficeId });
        }
      }

          // Handle distribution and parallel routing
          if (canDistribute && newDistributionEntries.length > 0) {
            try {
              // Separate "For Action" recipients (parallel routing) from other distribution.
              // Parallel routing now supports BOTH person (user) and office recipients.
              const actionRecipients = newDistributionEntries.filter(
                (r) => r.purpose === 'action'
              );
              const _otherDistribution = newDistributionEntries.filter(
                (r) => r.purpose !== 'action'
              );

              // Create a map to track which parallel minute belongs to which recipient (defined outside if block for scope)
              const recipientToMinuteMap = new Map<string, string>();

              // Create parallel minutes for "For Action" recipients
              const parallelMinuteIds: string[] = [];
              if (actionRecipients.length === 1) {
                toast.error('Parallel routing requires at least two recipients marked For Action.');
              } else if (actionRecipients.length > 0) {
                logInfo('[MinuteModal] Creating parallel minutes for action recipients', actionRecipients);
                
                // Generate parallel group ID for grouping parallel branches (UUID format)
                // Use a simple UUID v4 generator
                const generateUUID = () => {
                  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                  });
                };
                const parallelGroupId = generateUUID();
            
            const parallelMinutes = await Promise.all(
              actionRecipients.map(async (recipient) => {
                // Resolve recipient identity + target office for both user and office branches
                const isUserRecipient = recipient.type === 'user';
                const recipientUserId = isUserRecipient ? (recipient.userId || recipient.id) : undefined;
                const recipientOfficeInfo = isUserRecipient && recipientUserId ? getUserOfficeInfo(recipientUserId) : undefined;
                const recipientOfficeId = isUserRecipient
                  ? recipientOfficeInfo?.office?.id
                  : recipient.type === 'office'
                    ? (recipient.officeId || recipient.id)
                    : undefined;
                
                const parallelMinutePayload = {
                  correspondence: correspondence.id,
                  user_id: currentUser.id, // Creator of the minute
                  grade_level: currentUser.gradeLevel,
                  action_type: actionType,
                  minute_text: recipient.customMinuteText?.trim() || minuteText.trim(),
                  direction: finalDirection,
                  step_number: nextStep,
                  from_office_id: currentUserOfficeId || undefined,
                  to_office_id: recipientOfficeId || undefined,
                  to_user_id: recipientUserId, // Recipient user (undefined for office branches)
                  purpose: 'action',
                  requires_response: true,
                  routing_type: 'parallel',
                  parallel_group_id: parallelGroupId,
                  is_parallel_branch: true,
                  parent_minute_id: createdMinuteId,
                };
                
                logInfo('[MinuteModal] Creating parallel minute', {
                  ...parallelMinutePayload,
                  recipientUserId,
                  recipientOfficeId,
                });
                
                const parallelMinuteResponse = await apiFetch<Record<string, unknown>>('/correspondence/minutes/', {
                  signal,
                  method: 'POST',
                  body: JSON.stringify(parallelMinutePayload),
                });
                
                const rawMinuteId = parallelMinuteResponse?.id;
                const minuteId =
                  typeof rawMinuteId === 'string'
                    ? rawMinuteId
                    : typeof rawMinuteId === 'number'
                      ? String(rawMinuteId)
                      : undefined;
                if (minuteId) {
                  const mapKey = isUserRecipient
                    ? (recipientUserId as string)
                    : (recipient.officeId || recipient.id);
                  recipientToMinuteMap.set(mapKey, minuteId);
                }
                
                return minuteId;
              }),
            );
            
            parallelMinuteIds.push(...parallelMinutes.filter((id): id is string => Boolean(id) && typeof id === 'string'));
            logInfo('[MinuteModal] Parallel minutes created', {
              minuteIds: parallelMinuteIds,
              recipientMap: Object.fromEntries(recipientToMinuteMap),
            });
            
            // Update correspondence workflow_state to "parallel" if we created parallel branches
            if (parallelMinuteIds.length > 0) {
              try {
                await apiFetch(`/correspondence/items/${correspondence.id}/`, {
                  signal,
                  method: 'PATCH',
                  body: JSON.stringify({
                    workflow_state: 'parallel',
                    active_parallel_branches: parallelMinuteIds.length,
                  }),
                });
                logInfo('[MinuteModal] Updated correspondence workflow_state to parallel');
              } catch (error: unknown) {
                logWarn('[MinuteModal] Failed to update workflow_state (non-critical)', error);
                // Non-critical - backend might handle this automatically
              }
              
              toast.success(`Created ${parallelMinuteIds.length} parallel routing branch(es).`);
            }
          }

          // Create distribution entries (for all recipients, including action users)
          const distributionResults = await Promise.all(
            newDistributionEntries.map(async (recipient, _index) => {
              // For action recipients, link to their parallel minute using the map
              let linkedMinuteId = createdMinuteId;
              if (recipient.purpose === 'action') {
                const mapKey =
                  recipient.type === 'user'
                    ? (recipient.userId || recipient.id)
                    : (recipient.officeId || recipient.id);
                const parallelMinuteId = recipientToMinuteMap.get(mapKey);
                if (parallelMinuteId) {
                  linkedMinuteId = parallelMinuteId;
                } else {
                  logWarn('[MinuteModal] Could not find parallel minute for recipient', { mapKey });
                }
              }
              
              const distributionPayload = {
                correspondence: correspondence.id,
                recipient_type: recipient.type,
                user: recipient.type === 'user' ? (recipient.userId || recipient.id) : null,
                office: recipient.type === 'office' ? (recipient.officeId || recipient.id) : null,
                directorate:
                  recipient.type === 'directorate'
                    ? recipient.directorateId ?? recipient.id
                    : recipient.directorateId ?? null,
                division:
                  recipient.type === 'division'
                    ? recipient.divisionId ?? recipient.id
                    : recipient.divisionId ?? null,
                department:
                  recipient.type === 'department'
                    ? recipient.departmentId ?? recipient.id
                    : recipient.departmentId ?? null,
                purpose: recipient.purpose ?? 'information',
                added_by_id: recipient.addedById ?? currentUser.id,
                minute_id: linkedMinuteId || undefined,  // Link distribution to the minute
              };
              
              logInfo('[MinuteModal] Creating distribution', {
                payload: distributionPayload,
                minuteId: linkedMinuteId,
                recipient,
              });
              
              return apiFetch('/correspondence/distribution/', {
                method: 'POST',
                body: JSON.stringify(distributionPayload),
              });
            }),
          );
          
          logInfo('[MinuteModal] Distribution created successfully', distributionResults);
          if (distributionResults.length > 0) {
            const actionCount = actionRecipients.length;
            let message = `Distribution added: ${distributionResults.length} recipient(s) notified.`;
            if (actionCount > 0) {
              message += ` ${actionCount} parallel routing branch(es) created.`;
            }
            toast.success(message);
          }
        } catch (error: unknown) {
          logError('[MinuteModal] Failed to create distribution/parallel routing', error);
          const errorMessage = error instanceof Error ? error.message : ERROR_UNKNOWN;
          logError('[MinuteModal] Distribution error details', {
            error,
            message: errorMessage,
          });
          // Don't fail the entire minute creation if distribution fails
          toast.error(`Minute created, but failed to add distribution recipients: ${errorMessage}. Please add them manually.`, {
            duration: 5000,
          });
        }
      }

      // Parent's handleMinuteClose will sync context after modal closes

      if (draftId) {
        try {
          await deleteDraft(draftId);
        } catch (error: unknown) {
          logError('Failed to delete draft', error);
        }
      }

      setShowConfirmation(false);

      bumpSidebarCounts();

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          setMinuteText('');
          setMinuteTextError('');
          setForwardTo('');
          setForwardToError('');
          setTargetOfficeId('');
          setRouteType('person');
          setActionType('minute');
          setDistribution([]);
          setHasDraft(false);
          setDraftId(null);
          setPersonSearchQuery('');
          setOfficeSearchQuery('');
          setOfficeFilterDirectorate('all');
          setOfficeFilterDivision('all');
        }, 100);
      }, 200);

      // Reset 2FA token after successful submission
      setTwoFAVerificationToken(null);
      
      toast.success('Minute added successfully', {
        description: forwardTo 
          ? `Forwarded to ${forwardUser?.name ?? 'selected user'}`
          : `Routed to ${officeOptions.find((office) => office.id === targetOfficeId)?.name ?? 'office'} inbox`,
      });
    } catch (error: unknown) {
      // Don't show error if request was cancelled
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return;
      }
      logError('Failed to record minute', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error as Record<string, unknown>);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleSaveDraft = async () => {
    try {
      const draft = await saveDraft({
        correspondenceId: correspondence.id,
        type: 'minute',
        content: minuteText,
        forwardTo,
        actionType,
      });
      
      setHasDraft(true);
      setDraftId(draft.id);
      
      toast.info('Draft saved', {
        description: 'You can continue editing later',
      });
    } catch (error: unknown) {
      logError('Failed to save draft', error);
      toast.error('Failed to save draft');
    }
  };

  const division = correspondence.divisionId ? getDivisionById(correspondence.divisionId) : null;

  const getTemplateContext = (): Record<string, string> => {
    const divisionEntity = currentUser?.division ? getDivisionById(currentUser.division) : null;
    const departmentEntity = currentUser?.department ? getDepartmentById(currentUser.department) : null;
    const now = new Date();
    const userName = currentUser?.name ?? '';
    const initials = userName
      ? userName
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('')
      : '';
    return {
      name: userName,
      title: currentUser?.systemRole ?? '',
      gradeLevel: currentUser?.gradeLevel ?? '',
      division: divisionEntity?.name ?? '',
      department: departmentEntity?.name ?? '',
      initials,
      date: formatDateShort(now.toISOString()),
      dateTime: formatDateTime(now.toISOString(), 'en-US'),
      referenceNumber: correspondence.referenceNumber ?? '',
    };
  };

  const renderTemplateText = (template: SignatureTemplate, context: Record<string, string>) => {
    let output = template.format;
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'gi');
      output = output.replace(regex, value ?? '');
    });
    return output;
  };

  const templateTypeForAction: SignatureTemplate['templateType'] = actionType === 'approve' ? 'approval' : 'minute';
  const relevantTemplates = signatureTemplates.filter(template => template.templateType === templateTypeForAction);
  const selectedTemplate = selectedTemplateId ? signatureTemplates.find(template => template.id === selectedTemplateId) ?? null : null;
  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="xl" height="fill">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
            Minute Correspondence
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs" aria-label="Draft loaded">
                Draft Loaded
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Add your comments and forward to the next level
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6 py-2">
          {/* Document Summary */}
          <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
<div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{correspondence.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>Ref: {correspondence.referenceNumber}</span>
                    <span>•</span>
                    <span>From: {correspondence.senderName}</span>
                    <span>•</span>
                    <span>{division?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    correspondence.priority === 'urgent' ? 'destructive' :
                    correspondence.priority === 'high' ? 'default' :
                    'secondary'
                  }>
                    {correspondence.priority}
                  </Badge>
                  {(() => {
                    const slaDays = getSLADays(correspondence.priority);
                    return slaDays !== null ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{slaDays} hour{slaDays !== 1 ? 's' : ''}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
</div>

          {/* Previous Minute */}
          {previousMinute && previousUser && (
            <>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Previous Minute</Label>
                <div className="rounded-xl border border-border/60 bg-background p-4">
<div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {previousUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{previousUser.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {previousUser.systemRole}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{previousMinute.minuteText}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(previousMinute.timestamp)}
                        </p>
                      </div>
                    </div>
</div>
              </div>
              <Separator />
            </>
          )}

          {/* Direction & Action Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Direction Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {isMD ? <ArrowDown className="h-4 w-4 text-info" /> : <ArrowUp className="h-4 w-4 text-success" />}
                Direction {!isMD && '*'}
              </Label>
              {canChooseDirection ? (
                <RadioGroup value={selectedDirection} onValueChange={(v: string) => {
                  setSelectedDirection(v as 'upward' | 'downward' | 'lateral');
                  setForwardTo(''); // Reset forward to when direction changes
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upward" id="direction-upward" />
                    <Label htmlFor="direction-upward" className="font-normal cursor-pointer flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-success" />
                      Upward
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="downward" id="direction-downward" />
                    <Label htmlFor="direction-downward" className="font-normal cursor-pointer flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-info" />
                      Downward
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lateral" id="direction-lateral" />
                    <Label htmlFor="direction-lateral" className="font-normal cursor-pointer flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                      Lateral
                    </Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-info" />
                  <span className="text-sm">Downward only</span>
                </div>
              )}
            </div>

            {/* Action Type - Clear Separation */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                Action Type *
              </Label>
              <RadioGroup value={actionType} onValueChange={(v: 'minute' | 'approve') => setActionType(v)}>
                <div className="space-y-3">
                  {/* Minute Option */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="minute" id="minute-only" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="minute-only" className="font-medium cursor-pointer flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        Add Minute
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Add a comment, instruction, or routing note. Optional signature. For workflow communication.
                      </p>
                    </div>
                  </div>
                  
                  {/* Approval Options — permission+scope+turn gated */}
                  {canApprove && (() => {
                    const required = (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
                    const isExecutiveTrack = required === 'executive';
                    if (isExecutiveTrack) {
                      if (isMD) {
                        return (
                          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                            actionType === 'approve' 
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                              : 'border-border hover:bg-muted/50'
                          }`}>
                            <RadioGroupItem value="approve" id="approve-forward" className="mt-1" />
                            <div className="flex-1 space-y-1">
                              <Label htmlFor="approve-forward" className="font-medium cursor-pointer flex items-center gap-2">
                                <Shield className="h-4 w-4 text-emerald-600" />
                                Executive Approval
                                {actionType === 'approve' && !isSignatureLoading && !userSignature && (
                                  <AlertCircle className="h-3 w-3 text-destructive" />
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                <strong className="text-emerald-600 dark:text-emerald-400">Formal executive approval with digital seal.</strong> Requires signature. 
                                This will apply a digital executive seal to the document.
                              </p>
                              {actionType === 'approve' && isSignatureLoading && !userSignature && (
                                <p className="text-xs text-muted-foreground mt-1">Checking signature…</p>
                              )}
                              {actionType === 'approve' && !isSignatureLoading && !userSignature && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Digital signature required for executive approval
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      // GM/AGM/ED endorsement on executive track
                      return (
                        <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                          actionType === 'approve' 
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' 
                            : 'border-border hover:bg-muted/50'
                        }`}>
                          <RadioGroupItem value="approve" id="approve-forward" className="mt-1" />
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="approve-forward" className="font-medium cursor-pointer flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-600" />
                              Endorse — Reviewed and endorsed
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Departmental endorsement for executive-track matter; will be forwarded for MD executive approval.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    // Departmental track
                    return (
                      <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                        actionType === 'approve' 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                          : 'border-border hover:bg-muted/50'
                      }`}>
                        <RadioGroupItem value="approve" id="approve-forward" className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <Label htmlFor="approve-forward" className="font-medium cursor-pointer flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            Departmental Approval
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Final approval for departmental matter within your authority.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Your Minute/Approval Text */}
          <div>
            {actionType === 'approve' && (() => {
              const required = (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
              if (required === 'executive' && isMD) {
                return (
                  <div className="mb-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      <strong>Executive Approval:</strong> This will apply a digital executive seal to the document. 
                      Your signature is required and will be embedded in the seal.
                    </p>
                  </div>
                );
              }
              if (required === 'executive' && !isMD) {
                return (
                  <div className="mb-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Endorsement:</strong> Reviewed and endorsed — forwarded for MD executive approval. Minute text is required.
                    </p>
                  </div>
                );
              }
              return (
                <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Departmental Approval:</strong> Final approval within your departmental authority. Minute text is required.
                  </p>
                </div>
              );
            })()}
            <Textarea
              id="minute"
              placeholder={
                actionType === 'approve' 
                  ? (() => {
                      const required = (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
                      if (required === 'executive' && isMD) return "Enter your executive approval comments (this will be included with the digital seal)...";
                      if (required === 'executive' && !isMD) return "Enter your endorsement comments — Reviewed and endorsed...";
                      return "Enter your departmental approval comments...";
                    })()
                  : "Enter your comments, instructions, or recommendations..."
              }
              value={minuteText}
              onChange={(e) => handleTextChange(e.target.value)}
              className={`min-h-[160px] resize-none text-[15px] leading-relaxed ${minuteTextError ? 'border-destructive' : ''} ${
                actionType === 'approve' ? 'border-emerald-200 dark:border-emerald-800 focus:border-emerald-500' : ''
              }`}
              maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
              aria-label={actionType === 'approve' ? "Approval comments" : "Minute text"}
              aria-required="true"
              aria-invalid={!!minuteTextError}
              aria-describedby={
                minuteTextError ? "minute-text-help minute-text-error" : "minute-text-help"
              }
            />
            <div className="flex items-center justify-between mt-1.5 min-h-[20px]">
              {minuteTextError ? (
                <p id="minute-text-error" className="text-xs text-destructive" role="alert">
                  {minuteTextError}
                </p>
              ) : (
                <span />
              )}
              <p id="minute-text-help" className="text-xs text-muted-foreground tabular-nums">
                {minuteText.length}/{MODAL_CONSTANTS.MINUTE_TEXT.MAX}
              </p>
            </div>
          </div>

          {/* Template Chips — inline, tap to insert */}
          {filteredMinuteTemplates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredMinuteTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                    bg-secondary/60 hover:bg-secondary text-secondary-foreground
                    transition-colors duration-150 active:scale-95"
                  onClick={() => {
                    const text = getTemplatePlainText(template);
                    if (!text) return;
                    setMinuteText(prev => {
                      const trimmed = prev.trim();
                      if (!trimmed) return text;
                      return trimmed + '\n\n' + text;
                    });
                  }}
                >
                  <FileText className="h-3 w-3 opacity-50" />
                  {template.title}
                </button>
              ))}
            </div>
          )}

          {/* Save as template — subtle inline action */}
          {minuteText.trim().length > 0 && (
            <div className="flex items-center gap-2">
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Save as template..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveMinuteTemplate();
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={handleSaveMinuteTemplate}
                disabled={!newTemplateName.trim()}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          )}

          {/* Route To - Using extracted RoutingSection component */}
          <RoutingSection
            routeType={routeType}
            onRouteTypeChange={(v) => {
              setRouteType(v);
              if (v === 'office') {
                setForwardTo('');
                setForwardToError('');
                setPersonSearchQuery('');
              } else {
                setTargetOfficeId('');
                setOfficeSearchQuery('');
                setOfficeFilterDirectorate('all');
                setOfficeFilterDivision('all');
              }
            }}
            forwardTo={forwardTo}
            onForwardToChange={setForwardTo}
            forwardToError={forwardToError}
            personSearchQuery={personSearchQuery}
            onPersonSearchQueryChange={setPersonSearchQuery}
            targetOfficeId={targetOfficeId}
            onTargetOfficeIdChange={(v) => {
              setTargetOfficeId(v);
              setForwardTo('');
            }}
            officeSearchQuery={officeSearchQuery}
            onOfficeSearchQueryChange={setOfficeSearchQuery}
            officeFilterDirectorate={officeFilterDirectorate}
            onOfficeFilterDirectorateChange={(v) => {
              setOfficeFilterDirectorate(v);
              setOfficeFilterDivision('all');
            }}
            officeFilterDivision={officeFilterDivision}
            onOfficeFilterDivisionChange={setOfficeFilterDivision}
            purpose={purpose}
            onPurposeChange={setPurpose}
            offices={officeOptionsForRouting}
            directorates={directorates}
            divisions={divisions}
            users={activeDirectoryUsers}
            assistantList={assistantList}
            approverList={approverList}
            suggestedNext={suggestedNext}
            findUserById={findUserById}
            getUserOfficeInfo={getUserOfficeInfoForRouting}
          />

          {/* Distribution (CC) - Only for Management Level */}
          {canDistribute && (
            <>
              <Separator />
              <DistributionSelector
                selectedDistribution={distribution}
                onDistributionChange={setDistribution}
                currentDivisionId={correspondence.divisionId}
                currentDepartmentId={correspondence.departmentId}
              />
            </>
          )}

          {/* Preview */}
          {minuteText && (forwardTo || targetOfficeId) && (
            <div className="rounded-xl border border-border/60 bg-muted/30 border-accent/20 p-4">
<Label className="text-sm font-semibold mb-2 block">Preview</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={(isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection)) === 'downward' ? 'default' : 'secondary'}>
                      {(isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection)) === 'downward' ? (
                        <>
                          <ArrowDown className="h-3 w-3 mr-1" />
                          Downward
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-3 w-3 mr-1" />
                          Upward
                        </>
                      )}
                    </Badge>
                    <Badge variant={actionType === 'approve' ? 'default' : 'outline'} className={
                      actionType === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : ''
                    }>
                      {actionType === 'approve' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Executive Approval
                        </>
                      ) : (
                        'Minute Only'
                      )}
                    </Badge>
                    {actionType === 'approve' && applySignature && userSignature && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Digital Seal
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    <strong>{currentUser?.name}</strong> will{' '}
                    {actionType === 'approve' ? (
                      <>
                        <strong className="text-emerald-600">approve with digital seal</strong> and forward to{' '}
                      </>
                    ) : (
                      'minute and forward to '
                    )}
                    <strong>
                      {forwardTo 
                        ? findUserById(forwardTo)?.name 
                        : offices.find(o => o.id === targetOfficeId)?.name + ' (Office Inbox)'}
                    </strong>
                  </p>
                  {actionType === 'approve' && applySignature && userSignature && selectedTemplate && (
                    <p className="text-xs text-muted-foreground">
                      Signature template: {selectedTemplate.name}
                    </p>
                  )}
                  {actionType === 'approve' && !userSignature && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Upload your signature in Settings → Signature before approving.
                    </div>
                  )}
                </div>
</div>
          )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 border-t pt-3 mt-2">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="gap-2"
            aria-label="Save draft"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel minute">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
              aria-label="Send minute"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Minute
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

        {/* Sibling portals — avoid nesting inside DialogContent */}
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirm}
          type="minute"
          data={{
            currentUserName: currentUser?.name ?? '',
            recipientName: forwardTo 
              ? (findUserById(forwardTo)?.name || '')
              : (offices.find(o => o.id === targetOfficeId)?.name + ' (Office)' || ''),
            actionType,
            content: minuteText,
            direction: (isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection)) as any,
            distribution: distribution.length > 0 ? distribution
              .filter((r) => r.type !== 'user') // Filter out user types for ConfirmationDialog
              .map((recipient) => {
                // Use the name from the recipient (should already be set by DistributionSelector)
                // Fallback to lookup if name is missing
                let recipientName = recipient.name;
                if (!recipientName) {
                  if (recipient.type === 'office' && recipient.officeId) {
                    recipientName = offices.find(o => o.id === recipient.officeId)?.name || 'Office';
                  } else if (recipient.type === 'directorate' && recipient.directorateId) {
                    recipientName = directorates.find(d => d.id === recipient.directorateId)?.name || 'Directorate';
                  } else if (recipient.type === 'division' && recipient.divisionId) {
                    recipientName = divisions.find(d => d.id === recipient.divisionId)?.name || 'Division';
                  } else if (recipient.type === 'department' && recipient.departmentId) {
                    recipientName = 'Department';
                  } else {
                    recipientName = recipient.type.charAt(0).toUpperCase() + recipient.type.slice(1);
                  }
                }
                return {
                  id: recipient.id,
                  type: recipient.type as 'office' | 'directorate' | 'division' | 'department',
                  name: recipientName,
                officeId: recipient.officeId,
                directorateId: recipient.directorateId,
                divisionId: recipient.divisionId,
                departmentId: recipient.departmentId,
                purpose: recipient.purpose || 'information',
              };
            }) : undefined,
          }}
        />

        <TwoFactorVerificationModal
          open={show2FAModal}
          onOpenChange={setShow2FAModal}
          onVerified={handle2FAVerified}
          correspondenceId={correspondence.id}
          title="Verify for Digital Seal"
          description="As an executive, your approval will apply a digital seal. Please verify your identity."
        />
  </>
  );
};

// Wrap with error boundary and memo
const MinuteModalWithErrorBoundary = React.memo((props: MinuteModalProps) => (
  <ModalErrorBoundary onClose={props.onClose}>
    <MinuteModalComponent {...props} />
  </ModalErrorBoundary>
));

MinuteModalWithErrorBoundary.displayName = 'MinuteModal';

// Named export (primary)
export { MinuteModalWithErrorBoundary as MinuteModal };
