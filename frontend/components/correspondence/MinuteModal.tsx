import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Save,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Search,
  Building2,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  getDivisionById,
  getDepartmentById,
  getDirectorateById,
  GRADE_LEVELS,
  type Correspondence,
  type DistributionRecipient,
  type User,
} from '@/lib/npa-structure';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { getSuggestedApprovers, filterUsersBySearch } from '@/lib/routing-utils';
import { DistributionSelector } from './DistributionSelector';
import { loadUserSignature, ensureDefaultSignatureTemplates, loadUserSignaturePreferences, type StoredSignature, type SignatureTemplate, type UserSignaturePreferences } from '@/lib/signature-storage';
import {
  initializeTemplates,
  getTemplatesForUser,
  createTemplate as createDocumentTemplate,
  deleteTemplate,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganization, type AssistantAssignment } from '@/contexts/OrganizationContext';
import { apiFetch } from '@/lib/api-client';

interface MinuteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
  direction: 'downward' | 'upward';
}

export const MinuteModal = ({ correspondence, isOpen, onClose, direction: initialDirection }: MinuteModalProps) => {
  const { addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [minuteText, setMinuteText] = useState('');
  const [minuteTextError, setMinuteTextError] = useState('');
  const [actionType, setActionType] = useState<'minute' | 'approve'>('minute');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionRecipient[]>([]);
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<'upward' | 'downward'>(initialDirection);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSignature, setUserSignature] = useState<StoredSignature | null>(null);
  const [applySignature, setApplySignature] = useState(false);
  const [applySignatureManuallySet, setApplySignatureManuallySet] = useState(false);
  const [signatureTemplates, setSignatureTemplates] = useState<SignatureTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
const [minuteTemplates, setMinuteTemplates] = useState<DocumentTemplate[]>([]);
const [selectedMinuteTemplateId, setSelectedMinuteTemplateId] = useState<string | null>(null);
const [newTemplateName, setNewTemplateName] = useState('');
const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const defaultUserSignaturePreferences: UserSignaturePreferences = {
    templateOverrides: {},
    autoApplyForMinutes: false,
  };
  const [userSignaturePreferences, setUserSignaturePreferences] = useState<UserSignaturePreferences>(defaultUserSignaturePreferences);
  const { currentUser: activeUser } = useCurrentUser();
  const { assistantAssignments, users: organizationUsers, offices, officeMemberships } = useOrganization();

  const allDirectoryUsers = organizationUsers;
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

  const activeOffices = useMemo(() => offices.filter((office) => office.isActive), [offices]);
  const officeOptions = useMemo(
    () => activeOffices.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [activeOffices],
  );
  const primaryOfficeMembership = useMemo(
    () =>
      currentUser
        ? officeMemberships.find(
            (membership) => membership.userId === currentUser.id && membership.isPrimary && membership.isActive,
          )
        : undefined,
    [officeMemberships, currentUser?.id],
  );

  useEffect(() => {
    if (!isOpen) return;
    const fallbackOfficeId =
      correspondence.currentOfficeId ??
      correspondence.owningOfficeId ??
      primaryOfficeMembership?.officeId ??
      '';
    setTargetOfficeId(fallbackOfficeId ?? '');
  }, [
    isOpen,
    correspondence.id,
    correspondence.currentOfficeId,
    correspondence.owningOfficeId,
    primaryOfficeMembership?.officeId,
  ]);
 
  useEffect(() => {
    initializeTemplates();
  }, []);

  const refreshMinuteTemplates = useCallback(
    (userArg?: User) => {
      initializeTemplates();
      const targetUser = userArg ?? currentUser;
      if (!targetUser) {
        setMinuteTemplates([]);
        return;
      }
      const templates = getTemplatesForUser(targetUser, 'minute');
      setMinuteTemplates(templates);
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
    if (!selectedUser) return;
    setCurrentUser(selectedUser);
    const signature = loadUserSignature(selectedUser.id);
    if (signature) {
      setUserSignature(signature);
    }
    refreshMinuteTemplates(selectedUser);
  }, [activeUser, organizationUsers, refreshMinuteTemplates]);

  // Check if user is management level (MDCS, EDCS, MSS1, MSS2, MSS3)
  const userPermissions = useUserPermissions(currentUser ?? undefined);
  const canDistribute = userPermissions.canDistribute;
  
  // Check if user is MD (highest level - can only send downward)
  const isMD = currentUser?.gradeLevel === 'MDCS';
  
  // Other users (below MD) can choose direction
  const canChooseDirection = !isMD;

  useEffect(() => {
    if (isOpen) {
      refreshMinuteTemplates(currentUser ?? undefined);

      // Load draft if exists
      const draft = getDraftByCorrespondence(correspondence.id, 'minute');
      if (draft) {
        setMinuteText(draft.content);
        setCharacterCount(draft.content.length);
        if (draft.forwardTo) setForwardTo(draft.forwardTo);
        if (draft.actionType) setActionType(draft.actionType as 'minute' | 'approve');
        setHasDraft(true);
        setDraftId(draft.id);
      } else {
        setHasDraft(false);
        setDraftId(null);
        setMinuteText('');
        setCharacterCount(0);
        setForwardTo('');
        setSelectedDirection(initialDirection);
        setSearchQuery('');
        setActionType('minute');
        setApplySignature(false);
        setNewTemplateName('');
        setSelectedMinuteTemplateId(null);
      }
    }
  }, [isOpen, correspondence.id, initialDirection, refreshMinuteTemplates, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      const signature = loadUserSignature(currentUser.id);
      setUserSignature(signature);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isOpen) return;
    refreshMinuteTemplates();
  }, [isOpen, refreshMinuteTemplates]);

  useEffect(() => {
    if (actionType === 'approve') {
      setApplySignature(true);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!userSignature) {
      setApplySignature(false);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!applySignatureManuallySet) {
      setApplySignature(userSignaturePreferences.autoApplyForMinutes ?? false);
    }
  }, [actionType, userSignature, userSignaturePreferences.autoApplyForMinutes, applySignatureManuallySet]);

  useEffect(() => {
    setApplySignatureManuallySet(false);
  }, [actionType]);

  useEffect(() => {
    const defaults = ensureDefaultSignatureTemplates();
    setSignatureTemplates(defaults);
  }, [isOpen]);

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

  useEffect(() => {
    if (currentUser?.id) {
      const prefs = loadUserSignaturePreferences(currentUser.id) ?? defaultUserSignaturePreferences;
      setUserSignaturePreferences({
        templateOverrides: { ...(prefs.templateOverrides ?? {}) },
        autoApplyForMinutes: prefs.autoApplyForMinutes ?? false,
      });
    } else {
      setUserSignaturePreferences(defaultUserSignaturePreferences);
    }
  }, [currentUser?.id]);

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

  useEffect(() => {
    const available = filteredMinuteTemplates;
    if (available.length === 0) {
      setSelectedMinuteTemplateId(null);
      return;
    }
    setSelectedMinuteTemplateId(prev => {
      if (prev && available.some(template => template.id === prev)) {
        return prev;
      }
      return available[0]?.id ?? null;
    });
  }, [filteredMinuteTemplates]);

  const selectedMinuteTemplate = useMemo(
    () => minuteTemplates.find(template => template.id === selectedMinuteTemplateId) ?? null,
    [minuteTemplates, selectedMinuteTemplateId],
  );

  const canDeleteSelectedTemplate =
    !!selectedMinuteTemplate &&
    selectedMinuteTemplate.scope === 'user' &&
    selectedMinuteTemplate.createdBy === currentUser?.id;

  // Get previous minute
  const previousMinute = useMemo(() => {
    return existingMinutes
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
    () => filterUsersBySearch(assistantCandidates, searchQuery, { includeDivision: true, includeDepartment: true, includeEmail: true }),
    [assistantCandidates, searchQuery]
  );
  const filteredApprovers = useMemo(
    () => filterUsersBySearch(baseApproversWithoutAssistants, searchQuery, { includeDivision: true, includeDepartment: true, includeEmail: true }),
    [baseApproversWithoutAssistants, searchQuery]
  );
  const filteredNext = filteredApprovers[0] ?? filteredAssistants[0] ?? null;
  const nextIsAssistant = filteredNext ? assistantAssignmentsById.has(filteredNext.id) : false;
  const approverList = !searchQuery.trim() && filteredNext && !nextIsAssistant && filteredApprovers.length > 0 && filteredApprovers[0].id === filteredNext.id
    ? filteredApprovers.slice(1)
    : filteredApprovers;
  const assistantList = !searchQuery.trim() && filteredNext && nextIsAssistant
    ? filteredAssistants.filter((user, index) => !(index === 0 && user.id === filteredNext.id))
    : filteredAssistants;

  const handleTextChange = (text: string) => {
    setMinuteText(text);
    setCharacterCount(text.length);
  };

  const handleApplyMinuteTemplate = () => {
    if (!selectedMinuteTemplate) {
      toast.error('Select a template to insert.');
      return;
    }

    const content = getTemplatePlainText(selectedMinuteTemplate);
    if (!content) {
      toast.error('Selected template has no content.');
      return;
    }

    const updated = minuteText.trim()
      ? `${minuteText.trim()}\n\n${content}`
      : content;

    handleTextChange(updated);
    toast.success('Template inserted into your minute.');
  };

  const handleSaveMinuteTemplate = () => {
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
    const created = createDocumentTemplate({
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

    refreshMinuteTemplates();
    setSelectedMinuteTemplateId(created.id);
    setNewTemplateName('');
    toast.success('Template saved for quick reuse.');
  };

  const handleDeleteSelectedMinuteTemplate = () => {
    if (!selectedMinuteTemplate || !canDeleteSelectedTemplate) {
      toast.error('Only custom templates can be removed.');
      return;
    }

    deleteTemplate(selectedMinuteTemplate.id);
    refreshMinuteTemplates();
    setSelectedMinuteTemplateId(null);
    toast.success('Template removed.');
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

    if (actionType === 'approve' && !userSignature) {
      toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
      return false;
    }

    if (applySignature) {
      const availableTemplates = relevantTemplates;
      if (availableTemplates.length > 0 && !selectedTemplateId) {
        toast.error('Please select a signature template.');
        return false;
      }
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

    if (canDistribute && distribution.length > 0) {
      distributionWithAddedBy = distribution.map((recipient) => ({
        ...recipient,
        addedById: recipient.addedById || currentUser.id,
        addedByName: recipient.addedByName || currentUser.name,
        addedAt: recipient.addedAt || new Date().toISOString(),
      }));
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

    setIsSubmitting(true);
    try {
      const existingKeys = new Set(
        existingDistribution.map((entry) => {
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
        const targetId =
          entry.type === 'directorate'
            ? entry.directorateId ?? entry.id
            : entry.type === 'division'
            ? entry.divisionId ?? entry.id
            : entry.departmentId ?? entry.id;
        return !existingKeys.has(`${entry.type}:${targetId}`);
      });

      // Create minute via API
      await apiFetch('/correspondence/minutes/', {
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

      // Update correspondence via API
      // Prevent setting current_approver to the current user
      if (forwardTo === currentUser.id) {
        toast.error('Cannot route correspondence to yourself. Please select a different recipient.');
        setShowConfirmation(false);
        setIsSubmitting(false);
        return;
      }
      
      const correspondenceUpdatePayload: any = {
        current_approver_id: forwardTo,
        status: 'in-progress',
        direction: finalDirection,
      };
      // Always update the office to the recipient's office (or explicitly selected office)
      // Note: Backend also handles this automatically, but we update here for immediate UI feedback
      const finalOfficeId = recipientOfficeId || targetOfficeId;
      if (finalOfficeId) {
        correspondenceUpdatePayload.current_office = finalOfficeId;
      }
      // Update correspondence - this is critical for routing
      const updateResponse = await apiFetch<any>(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(correspondenceUpdatePayload),
      });
      
      // Verify the update was successful
      const expectedOfficeId = recipientOfficeId || targetOfficeId;
      if (!updateResponse) {
        console.warn('Correspondence update failed - no response received');
      } else {
        const actualApproverId = updateResponse.current_approver_id || updateResponse.current_approver;
        const actualOfficeId = updateResponse.current_office_id || updateResponse.current_office;
        
        if (actualApproverId !== forwardTo) {
          console.warn('Correspondence update may not have applied correctly. Current approver:', actualApproverId, 'Expected:', forwardTo);
        }
        
        if (expectedOfficeId && actualOfficeId !== expectedOfficeId) {
          console.warn('Correspondence office may not have been set correctly. Current office:', actualOfficeId, 'Expected:', expectedOfficeId);
        }
      }

      if (canDistribute && newDistributionEntries.length > 0) {
        await Promise.all(
          newDistributionEntries.map((recipient) =>
            apiFetch('/correspondence/distribution/', {
              method: 'POST',
              body: JSON.stringify({
                correspondence: correspondence.id,
                recipient_type: recipient.type,
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
              }),
            }),
          ),
        );
      }

      await syncFromApi();

      if (draftId) {
        deleteDraft(draftId);
      }

      setShowConfirmation(false);

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          setMinuteText('');
          setMinuteTextError('');
          setForwardTo('');
          setForwardToError('');
          setActionType('minute');
          setDistribution([]);
          setHasDraft(false);
          setDraftId(null);
          setSearchQuery('');
        }, 100);
      }, 200);

      toast.success('Minute added successfully', {
        description: forwardTo 
          ? `Forwarded to ${forwardUser?.name ?? 'selected user'}`
          : `Routed to ${officeOptions.find((office) => office.id === targetOfficeId)?.name ?? 'office'} inbox`,
      });
    } catch (error: any) {
      logError('Failed to record minute', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    const draft = saveDraft({
      id: draftId || generateId('draft'),
      correspondenceId: correspondence.id,
      type: 'minute',
      content: minuteText,
      forwardTo,
      actionType,
      timestamp: new Date().toISOString(),
    });
    
    setHasDraft(true);
    setDraftId(draft.id);
    
    toast.info('Draft saved', {
      description: 'You can continue editing later',
    });
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
      date: now.toLocaleDateString('en-US'),
      dateTime: now.toLocaleString('en-US'),
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
  const templatePreview = selectedTemplate && applySignature
    ? renderTemplateText(selectedTemplate, getTemplateContext())
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minute Correspondence
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Draft Loaded
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Add your comments and forward to the next level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Document Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
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
                <Badge variant={
                  correspondence.priority === 'urgent' ? 'destructive' :
                  correspondence.priority === 'high' ? 'default' :
                  'secondary'
                }>
                  {correspondence.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Previous Minute */}
          {previousMinute && previousUser && (
            <>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Previous Minute</Label>
                <Card className="bg-background">
                  <CardContent className="p-4">
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
                          {new Date(previousMinute.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                <RadioGroup value={selectedDirection} onValueChange={(v: any) => {
                  setSelectedDirection(v);
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
                </RadioGroup>
              ) : (
                <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-info" />
                  <span className="text-sm">Downward only</span>
                </div>
              )}
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                Action Type
              </Label>
              <RadioGroup value={actionType} onValueChange={(v: any) => setActionType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minute" id="minute-only" />
                  <Label htmlFor="minute-only" className="font-normal cursor-pointer">
                    Minute only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approve" id="approve-forward" />
                  <Label htmlFor="approve-forward" className="font-normal cursor-pointer flex items-center gap-1">
                    Approve & Forward
                    {actionType === 'approve' && !userSignature && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Your Minute */}
          <div className="space-y-3">
            <Label htmlFor="minute" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Your Minute *
            </Label>

            {/* Collapsible Template Section */}
            <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Minute Templates
                    {filteredMinuteTemplates.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {filteredMinuteTemplates.length}
                      </Badge>
                    )}
                  </span>
                  {templateSectionOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="p-3 border border-border rounded-lg bg-muted/30 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selectedMinuteTemplateId ?? 'none'}
                      onValueChange={(value) => setSelectedMinuteTemplateId(value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template</SelectItem>
                        {filteredMinuteTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyMinuteTemplate}
                      disabled={!selectedMinuteTemplate}
                    >
                      Insert
                    </Button>
                    {canDeleteSelectedTemplate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteSelectedMinuteTemplate}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {selectedMinuteTemplate && (
                    <div className="rounded-md border border-dashed p-2 text-xs bg-background">
                      <p className="font-medium text-foreground mb-1">{selectedMinuteTemplate.title}</p>
                      <p className="text-muted-foreground line-clamp-2">
                        {getTemplatePlainText(selectedMinuteTemplate)}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Save current as template..."
                      className="flex-1 min-w-[150px] h-8"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveMinuteTemplate}
                      disabled={!minuteText.trim()}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Textarea
              id="minute"
              placeholder="Enter your comments, instructions, or recommendations..."
              value={minuteText}
              onChange={(e) => handleTextChange(e.target.value)}
              className={`min-h-[120px] resize-none ${minuteTextError ? 'border-destructive' : ''}`}
              maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
              aria-label="Minute text"
              aria-required="true"
              aria-invalid={!!minuteTextError}
              aria-describedby="minute-text-help minute-text-error"
            />
            <div className="flex justify-between text-xs">
              {minuteTextError ? (
                <span className="text-destructive flex items-center gap-1" id="minute-text-error" role="alert">
                  <AlertCircle className="h-3 w-3" />
                  {minuteTextError}
                </span>
              ) : (
                <span className="text-muted-foreground">Use @ to mention others</span>
              )}
              <span className={
                characterCount > MODAL_CONSTANTS.MINUTE_TEXT.MAX 
                  ? 'text-destructive' 
                  : characterCount > MODAL_CONSTANTS.MINUTE_TEXT.MAX * 0.9 
                    ? 'text-warning' 
                    : 'text-muted-foreground'
              }>
                {characterCount} / {MODAL_CONSTANTS.MINUTE_TEXT.MAX}
              </span>
            </div>
          </div>

          {/* Route To - Distribution Style */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Route To *</Label>
                <Badge variant={(forwardTo || targetOfficeId) ? 'default' : 'outline'} className="text-xs">
                  {forwardTo ? '1 person' : targetOfficeId ? '1 office' : '0 recipients'}
                </Badge>
              </div>
              {forwardToError && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {forwardToError}
                </span>
              )}
            </div>

            {/* Selection Form - Grid Layout like Distribution */}
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Route Type Column */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Route Type</Label>
                  <Select 
                    value={forwardTo ? 'person' : (targetOfficeId ? 'office' : 'person')} 
                    onValueChange={(v) => {
                      if (v === 'office') {
                        setForwardTo('');
                        setForwardToError('');
                      } else {
                        setTargetOfficeId('');
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Person
                        </div>
                      </SelectItem>
                      <SelectItem value="office">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Office
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Person or Office Column */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    {(!forwardTo && targetOfficeId) ? (
                      <><Building2 className="h-3 w-3" /> Office</>
                    ) : (
                      <><UserIcon className="h-3 w-3" /> Person</>
                    )}
                  </Label>
                  {(!forwardTo && targetOfficeId) ? (
                    /* Office Selector */
                    <Select value={targetOfficeId} onValueChange={(v) => {
                      setTargetOfficeId(v);
                      setForwardTo('');
                      setForwardToError('');
                    }}>
                      <SelectTrigger className={`h-9 ${forwardToError ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search offices..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8 h-8"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {officeOptions
                          .filter(office => 
                            !searchQuery.trim() || 
                            office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            office.code?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map(office => (
                            <SelectItem key={office.id} value={office.id}>
                              <div className="flex flex-col">
                                <span>{office.name}</span>
                                <span className="text-xs text-muted-foreground uppercase">
                                  {office.officeType}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* Person Selector */
                    <Select value={forwardTo} onValueChange={(v) => {
                      setForwardTo(v);
                      setForwardToError('');
                    }}>
                      <SelectTrigger className={`h-9 ${forwardToError ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                      {/* Search Input */}
                      <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      
                      {assistantList.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                            Assistants ({assistantList.length})
                          </div>
                          {assistantList.map((user) => {
                            const userInfo = getUserOfficeInfo(user.id);
                            return (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.systemRole}
                                    {userInfo?.office && ` • ${userInfo.office.name}`}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                          <Separator className="my-1" />
                        </>
                      )}

                      {filteredNext && !searchQuery.trim() && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-success">
                            Suggested Next
                          </div>
                          <SelectItem value={filteredNext.id}>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-success shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium">{filteredNext.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {filteredNext.systemRole} • {filteredNext.gradeLevel}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                          <Separator className="my-1" />
                        </>
                      )}

                      {approverList.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            All Recipients ({approverList.length})
                          </div>
                          {approverList.slice(0, 30).map(user => {
                            const userInfo = getUserOfficeInfo(user.id);
                            return (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex flex-col">
                                  <span>{user.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.systemRole}
                                    {userInfo?.division && ` • ${userInfo.division.name}`}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </>
                      )}

                      {approverList.length === 0 && !assistantList.length && !filteredNext && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No recipients available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  )}
                </div>

                {/* Purpose Column */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Purpose
                  </Label>
                  <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-warning" />
                          For Action
                        </div>
                      </SelectItem>
                      <SelectItem value="information">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-info" />
                          For Information
                        </div>
                      </SelectItem>
                      <SelectItem value="comment">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-success" />
                          For Comment
                        </div>
                      </SelectItem>
                      <SelectItem value="approval">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          For Approval
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Selected Recipient Card - Person */}
            {forwardTo && (() => {
              const recipientUser = findUserById(forwardTo);
              const recipientInfo = getUserOfficeInfo(forwardTo);
              return (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Selected Recipient
                  </Label>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{recipientUser?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {recipientUser?.systemRole} • {recipientUser?.gradeLevel}
                            </p>
                            {recipientInfo && (
                              <p className="text-xs text-muted-foreground truncate">
                                {recipientInfo.office?.name}
                                {recipientInfo.division && ` • ${recipientInfo.division.name}`}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 shrink-0 ${
                              purpose === 'information' ? 'bg-info/10 text-info border-info/20' :
                              purpose === 'action' ? 'bg-warning/10 text-warning border-warning/20' :
                              purpose === 'comment' ? 'bg-success/10 text-success border-success/20' :
                              'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {purpose === 'information' ? <FileText className="h-3 w-3" /> :
                             purpose === 'action' ? <CheckCircle className="h-3 w-3" /> :
                             purpose === 'comment' ? <MessageSquare className="h-3 w-3" /> :
                             <CheckCircle className="h-3 w-3" />}
                            {purpose === 'information' ? 'Info' : 
                             purpose === 'action' ? 'Action' : 
                             purpose === 'comment' ? 'Comment' : 'Approval'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setForwardTo('')}
                          aria-label="Remove recipient"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Selected Recipient Card - Office */}
            {!forwardTo && targetOfficeId && (() => {
              const selectedOffice = offices.find(o => o.id === targetOfficeId);
              return (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Selected Office
                  </Label>
                  <Card className="border-secondary/30 bg-secondary/5">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{selectedOffice?.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">
                              {selectedOffice?.officeType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Will be routed to office inbox
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            Office
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setTargetOfficeId('')}
                          aria-label="Remove office"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {!forwardTo && !targetOfficeId && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No recipient selected. Choose a person or office to route this correspondence.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Digital Signature */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Digital Signature</Label>
              {actionType === 'approve' && (
                <Badge variant="destructive" className="text-[10px]">Required</Badge>
              )}
            </div>
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                {userSignature ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-medium text-foreground">Signature on File</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(userSignature.uploadedAt).toLocaleString()} {userSignature.fileName ? `• ${userSignature.fileName}` : ''}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg bg-background self-start">
                        <img
                          src={userSignature.imageData}
                          alt="Digital signature preview"
                          className="max-h-24 object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Signature Template</Label>
                      {relevantTemplates.length > 0 ? (
                        <Select
                          value={selectedTemplateId ?? undefined}
                          onValueChange={(value) => setSelectedTemplateId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex flex-col text-xs">
                                  <span className="font-medium text-foreground text-sm">{template.name}</span>
                                  <span className="text-muted-foreground">{template.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 border border-dashed rounded bg-muted/30 text-xs text-muted-foreground">
                          No templates available for this action.
                        </div>
                      )}
                    </div>

                    {selectedTemplate && applySignature && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Template Preview</Label>
                        <div className="p-3 border border-dashed rounded bg-muted/20">
                          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{selectedTemplate.style}</Badge>
                          </div>
                          <p className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                            {templatePreview}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-destructive font-medium">No signature on file.</p>
                      <p>
                        Please upload your signature in{' '}
                        <Link href="/settings#signature" className="text-primary underline">
                          Settings → Signature
                        </Link>{' '}
                        before approving correspondence.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>
                      {actionType === 'approve'
                        ? 'A digital signature will be applied automatically for this approval.'
                        : 'Apply your signature to this minute for acknowledgement.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={applySignature && !!userSignature}
                      onCheckedChange={(checked) => {
                        if (actionType === 'approve') return;
                        setApplySignatureManuallySet(true);
                        setApplySignature(checked && !!userSignature);
                      }}
                      disabled={!userSignature || actionType === 'approve'}
                    />
                    <span className="text-xs">
                      {actionType === 'approve' ? 'Required' : applySignature && userSignature ? 'Will be applied' : 'Not applied'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
            <Card className="bg-muted/30 border-accent/20">
              <CardContent className="p-4">
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
                    <Badge variant="outline">
                      {actionType === 'approve' ? 'Approve & Forward' : 'Minute Only'}
                    </Badge>
                    {applySignature && userSignature && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Signature Applied
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    <strong>{currentUser?.name}</strong> will minute and forward to{' '}
                    <strong>
                      {forwardTo 
                        ? findUserById(forwardTo)?.name 
                        : offices.find(o => o.id === targetOfficeId)?.name + ' (Office Inbox)'}
                    </strong>
                  </p>
                  {applySignature && userSignature && selectedTemplate && (
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
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        {/* Confirmation Dialog */}
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
            direction: isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection),
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
