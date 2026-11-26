"use client";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAbortController } from '@/hooks/use-abort-controller';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import { toast } from "@/components/ui/sonner";
import { formatDateShort, formatDateTime } from "@/lib/datetime";
import {
  MessageSquare,
  Send,
  Save,
  CheckCircle,
  FileText,
  AlertCircle,
  Loader2,
  Shield,
  ChevronDown,
  LayoutTemplate,
  Plus,
  Search,
  X,
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
import { filterUsersBySearch } from '@/lib/routing-utils';
import { PrimaryRoutePanel } from './PrimaryRoutePanel';
import { CorrespondenceContextCard, PreviousMinuteLine } from './CorrespondenceContextCard';
import { submitParallelRoute, submitCcDistribution } from '@/lib/parallel-routing';
import type { AssignmentMergeStrategy, BranchConfig } from '@/lib/parallel-routing';
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
import { type AssistantAssignment } from '@/contexts/OrganizationContext';
import { useOrganizationCatalogs } from '@/hooks/use-organization-catalogs';
import { useScopedOfficeMemberships } from '@/hooks/use-scoped-office-memberships';
import { useUserLookup } from '@/hooks/use-user-lookup';
import { useRoutingSuggestions } from '@/hooks/use-routing-suggestions';
import { useGradeCatalog } from '@/hooks/use-grade-catalog';
import { getGradeSeniority, gradeHasTier } from '@/lib/grade-catalog';
import { apiFetch } from '@/lib/api-client';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { TwoFactorVerificationModal } from '@/components/seals/TwoFactorVerificationModal';
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import React from 'react';

const MINUTE_TEMPLATE_SCOPE_ORDER = [
  'organization',
  'directorate',
  'division',
  'department',
  'user',
] as const;

const MINUTE_TEMPLATE_SCOPE_LABELS: Record<DocumentTemplate['scope'], string> = {
  organization: 'Organization',
  directorate: 'Directorate',
  division: 'Division',
  department: 'Department',
  user: 'Personal',
};

const getTemplatePlainText = (template: DocumentTemplate) => {
  if (template.contentText && template.contentText.trim().length > 0) {
    return template.contentText.trim();
  }
  if (!template.contentHtml) return '';
  return template.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

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
  const [purpose, setPurpose] = useState<'action' | 'information' | 'approval'>('action');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionRecipient[]>([]);
  const [routeMode, setRouteMode] = useState<'single' | 'parallel'>('single');
  const [parallelUserIds, setParallelUserIds] = useState<string[]>([]);
  const [parallelOfficeIds, setParallelOfficeIds] = useState<string[]>([]);
  const [branchConfigs, setBranchConfigs] = useState<Record<string, BranchConfig>>({});
  const [mergeStrategy, setMergeStrategy] = useState<AssignmentMergeStrategy>('independent');
  const [distributionUserIds, setDistributionUserIds] = useState<string[]>([]);
  const [distributionOfficeIds, setDistributionOfficeIds] = useState<string[]>([]);
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 2FA state for executive approvals
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAVerificationToken, setTwoFAVerificationToken] = useState<string | null>(null);
  const [approvalReceipt, setApprovalReceipt] = useState<{
    minuteId: string;
    officeName: string;
    finalApproval: boolean;
  } | null>(null);
  const [approvedCopyLoading, setApprovedCopyLoading] = useState(false);
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
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState('');
  const templateSearchRef = useRef<HTMLInputElement | null>(null);
  const { currentUser: activeUser } = useCurrentUser();
  const gradeCatalog = useGradeCatalog();
  const {
    assistantAssignments,
    ensureAssistantAssignments,
    offices,
    officeMemberships: signedInOfficeMemberships,
    directorates,
    divisions,
  } = useOrganizationCatalogs('offices', 'directorates', 'divisions');

  useEffect(() => {
    if (isOpen) void ensureAssistantAssignments('principal');
  }, [isOpen, ensureAssistantAssignments]);

  const officeMemberships = useScopedOfficeMemberships({
    enabled: isOpen,
    baseMemberships: signedInOfficeMemberships,
    userId: forwardTo || undefined,
    officeId: targetOfficeId || undefined,
  });

  // Use shared signature hook (after activeUser is available)
  const { signature: userSignature, templates: signatureTemplates, preferences: userSignaturePreferences, isLoading: isSignatureLoading } = useSignature({
    userId: activeUser?.id,
    autoLoad: isOpen,
  });

  const assistantUserIds = useMemo(
    () =>
      currentUser
        ? assistantAssignments
            .filter((assignment) => assignment.executiveId === currentUser.id)
            .map((assignment) => assignment.assistantId)
        : [],
    [assistantAssignments, currentUser],
  );
  const assistantUsersById = useUserLookup(assistantUserIds);

  const assistantTeam = useMemo(() => {
    if (!currentUser) return [];
    return assistantAssignments
      .filter((assignment) => assignment.executiveId === currentUser.id)
      .map((assignment) => {
        const assistant = assistantUsersById.get(assignment.assistantId);
        if (!assistant || assistant.active === false) {
          return null;
        }
        return { assignment, assistant } as { assignment: AssistantAssignment; assistant: User };
      })
      .filter((entry): entry is { assignment: AssistantAssignment; assistant: User } => entry !== null);
  }, [assistantAssignments, assistantUsersById, currentUser]);

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

  // A minute opens with no destination. Pre-filling the office the record
  // already sits in looked like a choice the sender had made, enabled Send,
  // and was rejected on submit as a same-office loop.
  useEffect(() => {
    if (!isOpen) return;
    setTargetOfficeId('');
    setPurpose('action');
  }, [isOpen, correspondence.id]);
 
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

  const insertMinuteTemplate = (template: DocumentTemplate) => {
    const text = getTemplatePlainText(template);
    if (!text) return;
    setMinuteText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${text}` : text;
    });
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
    const selectedUser = activeUser ?? null;
    if (!isOpen || !selectedUser) return;
    setCurrentUser(selectedUser);
    refreshMinuteTemplates(selectedUser).catch((error) => {
      logError('Failed to refresh templates', error);
    });
  }, [isOpen, activeUser, refreshMinuteTemplates]);

  // Check if user is management level (MDCS, EDCS, MSS1, MSS2, MSS3)
  const userPermissions = useUserPermissions(currentUser ?? undefined);
  const canDistribute = userPermissions.canDistribute;
  
  // Check if user is MD (highest level - can only send downward)
  const isMD = currentUser?.gradeLevel === 'MDCS' || currentUser?.systemRole === 'Managing Director';
  
  // Approvals here are executive only: the Managing Director approves, other
  // executives endorse. Departmental approval is not offered from this modal.
  const approvalLevel =
    (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
  const isExecutiveTrack = approvalLevel === 'executive';

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
  const canOfferApproval = canApprove && (isMD || isExecutiveTrack);

  // Reset action type to 'minute' when approval is not on offer.
  useEffect(() => {
    if (!canOfferApproval && actionType === 'approve') {
      setActionType('minute');
    }
  }, [canOfferApproval, actionType]);

  // Check if user leads a directorate (for seal preview). The served tier
  // covers the Managing Director and Executive Director.
  const isExecutive = gradeHasTier(
    gradeCatalog,
    currentUser?.gradeLevel,
    'directorateLeadership',
  );

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
      setApprovalReceipt(null);
      setApprovedCopyLoading(false);
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

  const matchedMinuteTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    if (!query) return filteredMinuteTemplates;
    return filteredMinuteTemplates.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        getTemplatePlainText(template).toLowerCase().includes(query),
    );
  }, [filteredMinuteTemplates, templateQuery]);

  const groupedMinuteTemplates = useMemo(
    () =>
      MINUTE_TEMPLATE_SCOPE_ORDER.map((scope) => ({
        scope,
        templates: matchedMinuteTemplates.filter((template) => template.scope === scope),
      })).filter((group) => group.templates.length > 0),
    [matchedMinuteTemplates],
  );

  // Opening the picker lands in the search field so a long list can be
  // narrowed without tabbing past every template.
  useEffect(() => {
    if (!templatesMenuOpen) return;
    const frame = window.requestAnimationFrame(() => templateSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [templatesMenuOpen]);

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

  const usersWhoAlreadyActed = useMemo(() => {
    const acted = new Set(
      existingMinutes
        .filter((minute) => !minute.isRecalled)
        .map((minute) => minute.userId)
        .filter(Boolean),
    );
    if (correspondence.currentApproverId) {
      const hasNonRecalledMinute = existingMinutes.some(
        (minute) => minute.userId === correspondence.currentApproverId && !minute.isRecalled,
      );
      if (hasNonRecalledMinute) acted.add(correspondence.currentApproverId);
    }
    return acted;
  }, [existingMinutes, correspondence.currentApproverId]);

  const routingDirection = isMD ? 'downward' : initialDirection;
  const suggestedApprovers = useRoutingSuggestions({
    enabled: isOpen && Boolean(currentUser),
    correspondenceId: correspondence.id,
    direction: routingDirection,
  });

  const selectedUserIds = useMemo(
    () =>
      [
        forwardTo,
        ...parallelUserIds,
        ...distributionUserIds,
        previousMinute?.userId,
      ].filter((id): id is string => Boolean(id)),
    [forwardTo, parallelUserIds, distributionUserIds, previousMinute?.userId],
  );
  const selectedUsersById = useUserLookup(selectedUserIds);

  const knownUserById = useMemo(() => {
    const byId = new Map<string, User>();
    for (const user of suggestedApprovers) byId.set(user.id, user);
    assistantUsersById.forEach((user, id) => byId.set(id, user));
    selectedUsersById.forEach((user, id) => byId.set(id, user));
    return byId;
  }, [suggestedApprovers, assistantUsersById, selectedUsersById]);

  const knownUsers = useMemo(() => [...knownUserById.values()], [knownUserById]);

  const findUserById = useCallback(
    (id: string) => knownUserById.get(id),
    [knownUserById],
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

  const previousUser = previousMinute ? findUserById(previousMinute.userId) : null;

  // Auto-compute Direction from sender vs recipient rank (tied to Route To).
  // The hierarchy comes from the served catalogue: rank 0 is most senior, so
  // the seniority score inverts it. Unknown grades keep the old default of 5.
  const rankOf = (code?: string | null): number => {
    const seniority = getGradeSeniority(gradeCatalog, code);
    return seniority >= 0 ? seniority : 5;
  };
  const OFFICE_RANK: Record<string, number> = {
    md: rankOf('MDCS'),
    ed: rankOf('EDCS'),
    gm: rankOf('MSS1'),
    agm: rankOf('MSS2'),
    directorate: rankOf('EDCS'),
    division: rankOf('MSS1'),
    department: rankOf('MSS2'),
  };
  const getComputedDirection = (sender: typeof currentUser, targetId: string, type: 'person' | 'office'): 'upward' | 'downward' | 'lateral' | null => {
    if (!sender) return null;
    if (type === 'person' && targetId) {
      const target = findUserById(targetId);
      if (target) {
        const s = rankOf(sender.gradeLevel);
        const t = rankOf((target as unknown as { gradeLevel: string }).gradeLevel);
        if (s < t) return 'upward';
        if (s > t) return 'downward';
        return 'lateral';
      }
    }
    if (type === 'office' && targetId) {
      const office = offices.find((o) => String(o.id) === String(targetId));
      if (office) {
        const s = rankOf(sender.gradeLevel);
        const t = OFFICE_RANK[String((office as unknown as { officeType: string }).officeType || '').toLowerCase()] ?? 5;
        if (s < t) return 'upward';
        if (s > t) return 'downward';
        return 'lateral';
      }
    }
    return null;
  };
  const autoDirection = getComputedDirection(currentUser, routeType === 'person' ? forwardTo : targetOfficeId, routeType);
  // Direction is never a choice: it follows who the minute is going to.
  const effectiveDirection = isMD ? 'downward' : (autoDirection ?? initialDirection);
  
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
      await createDocumentTemplate({
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

    // Must select either a person OR an office (single), or two or more separate assignments
    if (actionType === 'minute' && routeMode === 'parallel') {
      if (parallelUserIds.length + parallelOfficeIds.length < 2) {
        setForwardToError('Assign separately requires at least two people or offices');
        return false;
      }
    } else if (routeType === 'office' ? !targetOfficeId : !forwardTo) {
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
    
    // MD approvals are executive approvals regardless of the record's
    // classification, so honor the signature's 2FA policy on either track.
    const isMDApproval = actionType === 'approve' && isMD && Boolean(userSignature);
    const requiresTwoFA = isMDApproval && userSignature?.require2fa !== false;
    
    if (requiresTwoFA && !twoFAVerificationToken) {
      // Show 2FA modal before any MD approval that applies a digital seal.
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

  const handleApprovalSuccessClose = useCallback(() => {
    setApprovalReceipt(null);
    onClose();
  }, [onClose]);

  const handleViewApprovedCopy = useCallback(async () => {
    if (!approvalReceipt?.minuteId) return;

    // Open the tab during the click so the PDF fetch is not treated as a
    // pop-up. The authenticated endpoint returns the sealed approved copy.
    const previewWindow = window.open('', '_blank');
    setApprovedCopyLoading(true);
    try {
      const pdfBlob = await apiFetch<Blob>(
        `/correspondence/minutes/${approvalReceipt.minuteId}/approval-pdf/`,
        { responseType: 'blob' },
      );
      const objectUrl = URL.createObjectURL(pdfBlob);
      if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
    } catch (error: unknown) {
      previewWindow?.close();
      logError('Failed to open approved copy', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not open the approved copy',
      );
    } finally {
      setApprovedCopyLoading(false);
    }
  }, [approvalReceipt?.minuteId]);

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

  // A picker or the template-name row owns Escape while it is open. Both the
  // shared shortcut and Radix's dialog dismiss listen on Escape, so this runs
  // in the capture phase to close only the innermost layer and keep the
  // composer (and its routing selections) intact.
  useEffect(() => {
    if (!isOpen || (!templatesMenuOpen && !saveTemplateOpen)) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (templatesMenuOpen) {
        setTemplatesMenuOpen(false);
        return;
      }
      setSaveTemplateOpen(false);
      setNewTemplateName('');
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [isOpen, templatesMenuOpen, saveTemplateOpen]);

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

    // Direction follows the destination, never a separate choice.
    const finalDirection = effectiveDirection;
    
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

    const routedOfficeName =
      offices.find((office) => String(office.id) === String(recipientOfficeId || targetOfficeId))?.name ||
      (forwardUser ? getUserOfficeInfo(forwardUser.id)?.office?.name : undefined) ||
      forwardUser?.name ||
      'the next office';
    const requiredApprovalLevel =
      (correspondence as unknown as { requiredApprovalLevel?: string }).requiredApprovalLevel ?? 'departmental';
    const isFinalApproval = actionType === 'approve' && (requiredApprovalLevel !== 'executive' || isMD);

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
      const isParallelMinute = actionType === 'minute' && routeMode === 'parallel';
      const minuteResponse = await apiFetch<Record<string, unknown>>('/correspondence/minutes/', {
        signal,
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          workflow_template: correspondence.workflowTemplateId ?? undefined,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          action_type: actionType,
          minute_text: minuteText.trim(),
          direction: finalDirection,
          step_number: nextStep,
          from_office_id: currentUserOfficeId || undefined,
          to_office_id: isParallelMinute ? undefined : (recipientOfficeId || targetOfficeId || undefined),
          to_user_id: isParallelMinute ? undefined : forwardTo || undefined,
          signature_payload: signaturePayload || undefined,
          purpose: purpose,
          requires_response: purpose === 'action' || purpose === 'approval',
          verification_token: twoFAVerificationToken || undefined,
        }),
      });
      
      const createdMinuteId =
        typeof minuteResponse?.id === 'string' ? minuteResponse.id : undefined;

      logInfo('[MinuteModal] Minute created', {
        minuteId: createdMinuteId,
        distributionEntriesToCreate: newDistributionEntries.length,
      });

      // Update correspondence via API (single route only — parallel sets workflow via API)
      if (!isParallelMinute) {
        if (forwardTo === currentUser.id) {
          toast.error('Cannot route correspondence to yourself. Please select a different recipient.');
          setShowConfirmation(false);
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }

        const correspondenceUpdatePayload: Record<string, unknown> = {
          status: 'in-progress',
          direction: finalDirection,
        };
        if (forwardTo) {
          correspondenceUpdatePayload.current_approver_id = forwardTo;
        }
        const finalOfficeId = recipientOfficeId || targetOfficeId;
        if (finalOfficeId) {
          correspondenceUpdatePayload.current_office = finalOfficeId;
        }
        await apiFetch<Record<string, unknown>>(`/correspondence/items/${correspondence.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(correspondenceUpdatePayload),
          signal,
        });
      }

      if (isParallelMinute && createdMinuteId) {
        try {
          await submitParallelRoute(apiFetch, {
            correspondenceId: correspondence.id,
            parallelUserIds,
            parallelOfficeIds,
            branchConfigs,
            defaultPurpose: purpose,
            defaultMinuteText: minuteText.trim(),
            mergeStrategy,
            parentMinuteId: createdMinuteId,
            signal,
          });
          toast.success(`Assigned separately to ${parallelUserIds.length + parallelOfficeIds.length} recipients.`);
        } catch (error: unknown) {
          logError('[MinuteModal] Failed to assign separately', error);
          toast.error('Minute saved, but assigning separately failed. Please retry from the Routing tab.');
        }
      }

      const ccUserIds = canDistribute ? distributionUserIds : [];
      const ccOfficeIds = canDistribute ? distributionOfficeIds : [];
      if (ccUserIds.length > 0 || ccOfficeIds.length > 0) {
        try {
          await submitCcDistribution(
            apiFetch,
            correspondence.id,
            ccUserIds,
            ccOfficeIds,
            currentUser?.id,
            createdMinuteId ?? undefined,
          );
          toast.success(`Distribution (CC): ${ccUserIds.length + ccOfficeIds.length} recipient(s) notified.`);
        } catch (error: unknown) {
          logError('[MinuteModal] Failed to create CC distribution', error);
          toast.error('Minute created, but CC distribution failed.');
        }
      }

      if (canDistribute && newDistributionEntries.length > 0) {
        const infoOnlyEntries = newDistributionEntries.filter((r) => r.purpose !== 'action');
        if (infoOnlyEntries.length > 0) {
          try {
            await Promise.all(
              infoOnlyEntries.map((recipient) =>
                apiFetch('/correspondence/distribution/', {
                  method: 'POST',
                  body: JSON.stringify({
                    correspondence: correspondence.id,
                    recipient_type: recipient.type,
                    user: recipient.type === 'user' ? (recipient.userId || recipient.id) : null,
                    office: recipient.type === 'office' ? (recipient.officeId || recipient.id) : null,
                    purpose: 'information',
                    added_by_id: recipient.addedById ?? currentUser.id,
                    minute_id: createdMinuteId || undefined,
                  }),
                })
              )
            );
          } catch (error: unknown) {
            logWarn('[MinuteModal] Legacy distribution entries failed', error);
          }
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

      // An approval minute already performs the routing. Show a receipt with
      // the actual destination instead of closing into a generic toast that
      // could be read as a second "send to Procurement" step.
      if (actionType === 'approve' && createdMinuteId) {
        setTwoFAVerificationToken(null);
        setApprovalReceipt({
          minuteId: createdMinuteId,
          officeName: routedOfficeName,
          finalApproval: isFinalApproval,
        });
        return;
      }

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
          setRouteMode('single');

          setParallelUserIds([]);
          setParallelOfficeIds([]);
          setBranchConfigs({});
          setMergeStrategy('independent');
          setDistributionUserIds([]);
          setDistributionOfficeIds([]);
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

  // A minute cannot be sent without somewhere to send it. The footer mirrors
  // the confirmation dialog's route requirement so nothing fails on submit.
  const activeDestination = routeType === 'office' ? targetOfficeId : forwardTo;
  const hasRouteDestination =
    actionType === 'minute' && routeMode === 'parallel'
      ? parallelUserIds.length + parallelOfficeIds.length >= 2
      : Boolean(activeDestination);

  const templateTypeForAction: SignatureTemplate['templateType'] = actionType === 'approve' ? 'approval' : 'minute';
  const relevantTemplates = signatureTemplates.filter(template => template.templateType === templateTypeForAction);
  return (
    <>
    <Dialog
      open={isOpen && !approvalReceipt}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="xl" height="fill" density="flush">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                actionType === 'approve' ? 'bg-emerald-500/10' : 'bg-primary/10'
              }`}
            >
              {actionType === 'approve' ? (
                <Shield className="h-[18px] w-[18px] text-emerald-600" aria-hidden="true" />
              ) : (
                <MessageSquare className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[17px] tracking-tight">
                {actionType === 'approve' ? 'Approve correspondence' : 'Minute correspondence'}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {actionType === 'approve'
                  ? 'Approving also routes the record to the destination you choose.'
                  : 'Write the minute, then choose who it goes to.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            <CorrespondenceContextCard
              correspondence={correspondence}
              divisionName={correspondence.divisionName ?? division?.name}
            />

            {previousMinute && (
              <PreviousMinuteLine
                minute={previousMinute}
                authorName={previousUser?.name ?? previousMinute.userName ?? 'Unknown'}
                authorRole={previousUser?.systemRole ?? previousMinute.userSystemRole}
              />
            )}

            {/* What is being recorded */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Minute type *</Label>
              {canOfferApproval ? (
                <SegmentedControl
                  ariaLabel="Minute type"
                  value={actionType}
                  onValueChange={setActionType}
                  className="sm:max-w-md"
                  options={[
                    { value: 'minute', label: 'Add Minute', icon: MessageSquare },
                    { value: 'approve', label: isMD ? 'Executive Approval' : 'Endorse', icon: Shield },
                  ]}
                />
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-[13px] text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Minute
                </div>
              )}
              {actionType === 'approve' ? (
                <p className="text-xs text-muted-foreground">
                  {isMD
                    ? 'Formal approval with your digital seal. Your signature is required.'
                    : 'Reviewed and endorsed — this moves on for the MD’s executive approval.'}
                </p>
              ) : canOfferApproval ? (
                <p className="text-xs text-muted-foreground">
                  {isMD
                    ? 'Add a minute, or use Executive Approval for a formal sealed decision.'
                    : 'Add a minute, or endorse (reviewed and endorsed) to pass this on for the MD’s executive approval.'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A note, instruction, or routing remark. No signature required.
                </p>
              )}
              {actionType === 'approve' && !isSignatureLoading && !userSignature && (
                <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Add your signature in Settings → Signature before approving.
                </p>
              )}
            </div>

            {/* Composer */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
                <Label htmlFor="minute" className="text-sm font-semibold">
                  {actionType === 'approve'
                    ? isMD
                      ? 'Approval note'
                      : 'Endorsement note'
                    : 'Your minute'}{' '}
                  *
                </Label>
                {hasDraft && (
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[11px] font-normal"
                    aria-label="Draft loaded"
                  >
                    Draft restored
                  </Badge>
                )}
              </div>
              <Textarea
                id="minute"
                placeholder={
                  actionType === 'approve'
                    ? isMD
                      ? 'Record your executive approval comments…'
                      : 'Record your endorsement comments…'
                    : 'Enter your comments, instructions, or recommendations…'
                }
                value={minuteText}
                onChange={(e) => handleTextChange(e.target.value)}
                className={`mt-2 min-h-[150px] resize-none border-0 bg-transparent px-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 ${
                  actionType === 'approve' ? 'focus-visible:bg-emerald-500/[0.04]' : ''
                }`}
                maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
                aria-label={actionType === 'approve' ? 'Approval comments' : 'Minute text'}
                aria-required="true"
                aria-invalid={!!minuteTextError}
              />
              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 py-1.5">
                <div className="flex items-center gap-1">
                  {filteredMinuteTemplates.length > 0 && (
                    <DropdownMenu
                      open={templatesMenuOpen}
                      onOpenChange={(open) => {
                        setTemplatesMenuOpen(open);
                        if (!open) setTemplateQuery('');
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground"
                        >
                          <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
                          Templates
                          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        aria-label="Insert a saved minute"
                        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain"
                      >
                        <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 border-b border-border/60 bg-popover px-2 py-2">
                          <div className="relative">
                            <Search
                              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <Input
                              ref={templateSearchRef}
                              type="search"
                              value={templateQuery}
                              onChange={(event) => setTemplateQuery(event.target.value)}
                              onKeyDown={(event) => {
                                // Keep menu typeahead and roving focus from
                                // stealing the keystrokes meant for the field.
                                event.stopPropagation();
                                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                                event.preventDefault();
                                const menu = event.currentTarget.closest('[role="menu"]');
                                const items = menu
                                  ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
                                  : [];
                                const target =
                                  event.key === 'ArrowDown' ? items[0] : items[items.length - 1];
                                target?.focus();
                              }}
                              placeholder="Find a template"
                              aria-label="Find a template"
                              className="h-8 pl-8 text-[13px]"
                            />
                          </div>
                        </div>
                        {groupedMinuteTemplates.map((group) => (
                          <DropdownMenuGroup key={group.scope}>
                            <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {MINUTE_TEMPLATE_SCOPE_LABELS[group.scope]}
                            </DropdownMenuLabel>
                            {group.templates.map((template) => (
                              <DropdownMenuItem
                                key={template.id}
                                onSelect={() => insertMinuteTemplate(template)}
                                className="items-start gap-2"
                              >
                                <FileText
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px]">{template.title}</span>
                                  <span className="block truncate text-[11px] text-muted-foreground">
                                    {getTemplatePlainText(template)}
                                  </span>
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        ))}
                        {groupedMinuteTemplates.length === 0 && (
                          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                            No templates match “{templateQuery.trim()}”.
                          </p>
                        )}
                        {minuteText.trim().length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setSaveTemplateOpen(true)}
                              className="gap-2 text-[13px]"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              Save this minute as a template
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {filteredMinuteTemplates.length === 0 && minuteText.trim().length > 0 && !saveTemplateOpen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground"
                      onClick={() => setSaveTemplateOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Save as template
                    </Button>
                  )}
                </div>
                <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
                  {minuteText.length}/{MODAL_CONSTANTS.MINUTE_TEXT.MAX}
                </span>
              </div>

              {saveTemplateOpen && (
                <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center">
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Name this template"
                    className="h-8 flex-1 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveMinuteTemplate().then(() => setSaveTemplateOpen(false));
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setSaveTemplateOpen(false);
                        setNewTemplateName('');
                      }
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setSaveTemplateOpen(false);
                        setNewTemplateName('');
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleSaveMinuteTemplate().then(() => setSaveTemplateOpen(false))}
                      disabled={!newTemplateName.trim()}
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {minuteTextError && (
                <p
                  id="minute-text-error"
                  className="border-t border-border/60 px-4 py-2 text-xs text-destructive"
                  role="alert"
                >
                  {minuteTextError}
                </p>
              )}
            </div>

          {/* Route — an approval minute carries its own destination */}
          {actionType === 'approve' ? (
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
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
              onForwardToChange={(v) => {
                setForwardTo(v);
                if (v) setTargetOfficeId('');
              }}
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
              purposeControl="information-toggle"
              offices={officeOptionsForRouting}
              directorates={directorates}
              divisions={divisions}
              assistantList={assistantList}
              approverList={approverList}
              suggestedNext={suggestedNext}
              findUserById={findUserById}
              getUserOfficeInfo={getUserOfficeInfoForRouting}
              />
              <p className="mt-4 rounded-xl bg-emerald-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                This destination is recorded on the approval minute. No separate transmittal is needed.
              </p>
            </div>
          ) : (
            <PrimaryRoutePanel
              routeMode={routeMode}
              onRouteModeChange={setRouteMode}
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
              onForwardToChange={(v) => {
                setForwardTo(v);
                if (v) setTargetOfficeId('');
              }}
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
              purposeControl="information-toggle"
              parallelUserIds={parallelUserIds}
              onParallelUserIdsChange={setParallelUserIds}
              parallelOfficeIds={parallelOfficeIds}
              onParallelOfficeIdsChange={setParallelOfficeIds}
              branchConfigs={branchConfigs}
              onBranchConfigsChange={setBranchConfigs}
              defaultBranchText={minuteText.trim()}
              mergeStrategy={mergeStrategy}
              onMergeStrategyChange={setMergeStrategy}
              distributionUserIds={distributionUserIds}
              onDistributionUserIdsChange={setDistributionUserIds}
              distributionOfficeIds={distributionOfficeIds}
              onDistributionOfficeIdsChange={setDistributionOfficeIds}
              showDistribution={canDistribute}
              offices={officeOptionsForRouting}
              directorates={directorates}
              divisions={divisions}
              users={knownUsers.filter((u) => u.id !== currentUser?.id)}
              assistantList={assistantList}
              approverList={approverList}
              suggestedNext={suggestedNext}
              findUserById={findUserById}
              getUserOfficeInfo={getUserOfficeInfoForRouting}
            />
          )}

          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border/60 bg-background/70 px-6 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="gap-2 text-muted-foreground"
              aria-label="Save draft"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Draft
            </Button>
            {hasDraft && (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">Saved on this device</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!hasRouteDestination && (
              <span className="text-xs text-muted-foreground sm:max-w-[180px] sm:text-right">
                Select a destination to send.
              </span>
            )}
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel minute">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasRouteDestination}
              className="gap-2 rounded-full px-5"
              aria-label={actionType === 'approve' ? 'Approve and route' : 'Send minute'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {actionType === 'approve' ? 'Approving…' : 'Sending…'}
                </>
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  Approve & Route
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
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
            direction: effectiveDirection,
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

        <Dialog
          open={Boolean(approvalReceipt)}
          onOpenChange={(open) => {
            if (!open) handleApprovalSuccessClose();
          }}
        >
          <DialogContent size="md" density="flush" className="overflow-hidden">
            <div className="border-b border-emerald-200/70 bg-emerald-50/80 px-6 py-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle className="h-6 w-6" />
              </div>
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-lg leading-snug text-emerald-950 dark:text-emerald-50">
                  {approvalReceipt?.finalApproval ? 'Approved' : 'Endorsed'} and routed to{' '}
                  {approvalReceipt?.officeName ?? 'the next office'}
                </DialogTitle>
                <DialogDescription className="text-emerald-800/80 dark:text-emerald-200/70">
                  The approval minute has already routed this record. No separate send step is required.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/25 p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="text-right font-medium">{correspondence.referenceNumber}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Routed to</span>
                  <span className="text-right font-medium">
                    {approvalReceipt?.officeName ?? 'the next office'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Approval minute</span>
                  <span className="text-right font-mono text-xs">
                    {approvalReceipt?.minuteId.slice(0, 8)}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The approved copy includes the memo and digital seal. You can open it now or from the
                Approvals register later.
              </p>
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-4">
              <Button variant="outline" onClick={handleApprovalSuccessClose}>
                Done
              </Button>
              <Button
                onClick={() => void handleViewApprovedCopy()}
                disabled={approvedCopyLoading || !approvalReceipt?.minuteId}
                className="gap-2"
              >
                {approvedCopyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                View approved copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
