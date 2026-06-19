"use client";
import { ERROR_UNKNOWN } from '@/lib/constants';

import { logError } from '@/lib/client-logger';
import { useMemo, useRef, useReducer, useEffect, useCallback, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { AlertCircle, ArrowLeft, FileText, Users, ArrowRight, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCorrespondence, mapApiCorrespondence, CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useApiRetry } from '@/hooks/use-api-retry';
import { useRoleChecks } from '@/hooks/use-role-checks';
import { handleAuthenticationError } from '@/lib/auth-errors';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { REGISTER_CONSTANTS, FORM_STEPS } from './register-constants';
import {
  FormData,
  FlowType,
  validateFormData,
  validateStep,
  buildSubmissionFormData,
  calculateCompletionPercentage,
  createDistributionEntries,
  generateReferenceNumber,
} from './register-utils';
import { registerReducer, createInitialState } from './register-state-reducer';
import { useDraftAutoSave } from './use-draft-auto-save';
import { OfficeSelectionCard } from './components/OfficeSelectionCard';
import { BasicInfoStep } from './components/BasicInfoStep';
import { PartiesStep } from './components/PartiesStep';
import { RoutingStep } from './components/RoutingStep';
import { DocumentsStep } from './components/DocumentsStep';
import { RegistrationSummary } from './components/RegistrationSummary';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

const CorrespondenceRegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const {
    directorates,
    divisions,
    departments,
    users: organizationUsers,
    offices,
    officeMemberships,
  } = useOrganization();
  const { syncFromApi } = useCorrespondence();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser);
  const { fetchWithRetry } = useApiRetry();
  const roleChecks = useRoleChecks();
  const abortControllerRef = useRef<AbortController | null>(null);
  const editLoadAbortControllerRef = useRef<AbortController | null>(null);
  const [loadingCorrespondence, setLoadingCorrespondence] = useState(!!editId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [validateOnStepChange, _setValidateOnStepChange] = useState(true);

  const isSuperAdmin = roleChecks.isSuperAdmin || roleChecks.isSystemAdmin;

  // Initialize state with useReducer - use stable initial state to avoid hydration issues
  const [state, dispatch] = useReducer(registerReducer, createInitialState());

  // Extract state values
  const {
    currentStep,
    formData,
    documentFiles,
    flowType,
    distributions,
    ui: { assignSearch, officeSearch, submitting, errors, hasDraft, mounted },
  } = state;

  // Load correspondence data if in edit mode - extracted as useCallback so it can be called from retry button
  const loadCorrespondenceForEdit = useCallback(async () => {
    if (!editId) return;
    
    // Cancel previous request
    if (editLoadAbortControllerRef.current) {
      editLoadAbortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const controller = new AbortController();
    editLoadAbortControllerRef.current = controller;
    
    try {
      setLoadingCorrespondence(true);
      setLoadError(null);
      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/${editId}/`,
        { signal: controller.signal }
      );
      
      if (!response) {
        throw new Error('No response from server');
      }
      
      // Map API response using the same mapping function used elsewhere
      const corr = mapApiCorrespondence(response);
      
      // Format dates for form inputs (YYYY-MM-DD format)
      const formatDateForInput = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };
      
      dispatch({
        type: 'UPDATE_FORM_DATA',
        payload: {
          subject: corr.subject || '',
          senderName: corr.senderName || '',
          senderOrganization: corr.senderOrganization || '',
          senderEmail: corr.senderEmail || '',
          senderPhone: corr.senderPhone || '',
          receivedDate: formatDateForInput(corr.receivedDate),
          letterDate: formatDateForInput(corr.letterDate),
          dispatchDate: formatDateForInput(corr.dispatchDate),
          priority: corr.priority || 'medium',
          referenceNumber: corr.referenceNumber || '',
          assignTo: corr.currentApproverId || '',
          divisionId: corr.divisionId || '',
          documentType: corr.documentType || 'letter',
          tags: Array.isArray(corr.tags) ? corr.tags.join(', ') : (corr.tags || ''),
          owningOfficeId: corr.owningOfficeId || '',
          senderReference: corr.senderReference || '',
          recipientName: corr.recipientName || '',
          recipientEmail: '',
          recipientPhone: '',
          remarks: corr.remarks || '',
        },
      });

      // Set flow type
      if (corr.direction) {
        const flowType = corr.direction === 'downward' ? 'outward' : 'inward';
        dispatch({ type: 'SET_FLOW_TYPE', payload: flowType });
      }

      // Load distributions if available (note: mapped field is 'distribution', not 'distributions')
      if (corr.distribution && Array.isArray(corr.distribution)) {
        const dist = {
          directorates: corr.distribution.filter((d: Record<string, unknown>) => d.type === 'directorate').map((d: Record<string, unknown>) => String(d.directorateId || '')).filter(Boolean),
          divisions: corr.distribution.filter((d: Record<string, unknown>) => d.type === 'division').map((d: Record<string, unknown>) => String(d.divisionId || '')).filter(Boolean),
          departments: corr.distribution.filter((d: Record<string, unknown>) => d.type === 'department').map((d: Record<string, unknown>) => String(d.departmentId || '')).filter(Boolean),
        };
        dispatch({ type: 'SET_DISTRIBUTIONS', payload: dist });
      }
    } catch (error: unknown) {
      // Ignore abort errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        return;
      }
      logError('Failed to load correspondence for editing', error);
      logError('Error loading correspondence:', error);
      let errorMessage = ERROR_UNKNOWN;
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        } else if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        } else if (errorObj.statusText && typeof errorObj.statusText === 'string') {
          errorMessage = errorObj.statusText;
        }
      }
      setLoadError(errorMessage);
      toast.error(`Failed to load correspondence: ${errorMessage}`, {
        description: editId ? `Could not load correspondence ${editId}` : 'Please try again or contact support',
      });
    } finally {
      if (!controller.signal.aborted) {
        setLoadingCorrespondence(false);
      }
    }
  }, [editId, dispatch]);

  // Trigger load when editId, mounted, and authentication are ready
  useEffect(() => {
    if (!editId || !mounted || !currentUser?.id) return;
    void loadCorrespondenceForEdit();
  }, [editId, mounted, currentUser?.id, loadCorrespondenceForEdit]);

  // Set mounted on client and generate reference number
  useEffect(() => {
    dispatch({ type: 'SET_MOUNTED', payload: true });
    // Generate reference number on client to avoid hydration mismatch
    // Only if not in edit mode (edit mode will have existing reference number)
    if (!editId && !formData.referenceNumber) {
      dispatch({
        type: 'UPDATE_FORM_DATA',
        payload: { referenceNumber: generateReferenceNumber() },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run once on mount
  }, []);

  // Draft auto-save hook - memoize callbacks to prevent infinite loops
  const handleDraftLoaded = useCallback((draft: { flowType?: FlowType; formData?: FormData; directorateDistribution?: string[]; divisionDistribution?: string[]; departmentDistribution?: string[] }) => {
    // Load draft data
    if (draft.flowType) {
      dispatch({ type: 'SET_FLOW_TYPE', payload: draft.flowType });
    }
    if (draft.formData) {
      dispatch({ type: 'SET_FORM_DATA', payload: draft.formData });
    }
    dispatch({
      type: 'SET_DISTRIBUTIONS',
      payload: {
        directorates: draft.directorateDistribution || [],
        divisions: draft.divisionDistribution || [],
        departments: draft.departmentDistribution || [],
      },
    });
    dispatch({ type: 'SET_HAS_DRAFT', payload: true });
  }, []);

  const handleHasDraftChange = useCallback((hasDraft: boolean) => {
    dispatch({ type: 'SET_HAS_DRAFT', payload: hasDraft });
  }, []);

  const { clearDraft } = useDraftAutoSave(
    flowType,
    formData,
    distributions,
    mounted,
    handleDraftLoaded,
    handleHasDraftChange
  );

  // Memoized computations
  const executives = useMemo(() => {
    if (!Array.isArray(organizationUsers)) return [];
    const eligibleGrades = new Set(REGISTER_CONSTANTS.ELIGIBLE_GRADES);
    return organizationUsers.filter(
      (user) => user && user.gradeLevel && eligibleGrades.has(user.gradeLevel as 'MSS4' | 'MSS3' | 'MSS2' | 'MSS1' | 'EDCS' | 'MDCS')
    );
  }, [organizationUsers]);

  const _filteredExecutives = useMemo(() => {
    if (!assignSearch.trim()) return executives;
    const query = assignSearch.toLowerCase();
    return executives.filter((user) =>
      [user.name, user.systemRole, user.email]
        .filter(Boolean)
        .some((value) => value && typeof value === 'string' && value.toLowerCase().includes(query))
    );
  }, [executives, assignSearch]);

  const directorateMap = useMemo(
    () => new Map(directorates.map((item) => [item.id as string, item.name])),
    [directorates]
  );

  const divisionMap = useMemo(
    () => new Map(divisions.map((item) => [item.id as string, item.name])),
    [divisions]
  );

  const departmentMap = useMemo(
    () => new Map(departments.map((item) => [item.id as string, item.name])),
    [departments]
  );

  const activeOffices = useMemo(
    () =>
      offices
        .filter((office) => office.isActive)
        .map((office) => ({
          ...office,
          directorateName: office.directorateId ? directorateMap.get(office.directorateId) : undefined,
          divisionName: office.divisionId ? divisionMap.get(office.divisionId) : undefined,
          departmentName: office.departmentId ? departmentMap.get(office.departmentId) : undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [offices, directorateMap, divisionMap, departmentMap]
  );

  const userOfficeMemberships = useMemo(
    () =>
      officeMemberships.filter(
        (membership) => membership.userId === currentUser?.id && membership.isActive
      ),
    [officeMemberships, currentUser?.id]
  );

  const membershipOffices = useMemo(() => {
    const membershipOfficeIds = new Set(userOfficeMemberships.map((membership) => membership.officeId));
    return activeOffices.filter((office) => membershipOfficeIds.has(office.id));
  }, [activeOffices, userOfficeMemberships]);

  const filteredOffices = useMemo(() => {
    if (!officeSearch.trim()) return membershipOffices;
    const query = officeSearch.toLowerCase();
    return membershipOffices.filter((office) => {
      const candidates = [
        office.name,
        office.code,
        office.directorateName,
        office.divisionName,
        office.departmentName,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return candidates.some((candidate) => candidate.includes(query));
    });
  }, [membershipOffices, officeSearch]);

  const completionPercentage = useMemo(
    () => calculateCompletionPercentage(formData, flowType, documentFiles),
    [formData, flowType, documentFiles]
  );

  const selectedOfficeName = activeOffices.find((office) => office.id === formData.owningOfficeId)?.name;
  // Find the office that has the selected user as primary holder
  const selectedAssigneeOffice = useMemo(() => {
    if (!formData.assignTo) return null;
    const membership = officeMemberships.find(
      (m) => m.userId === formData.assignTo && m.isPrimary && m.isActive
    );
    return membership ? activeOffices.find((o) => o.id === membership.officeId) : null;
  }, [formData.assignTo, officeMemberships, activeOffices]);
  const selectedAssigneeName = selectedAssigneeOffice?.name || 
    organizationUsers.find((u) => u.id === formData.assignTo)?.name;

  // Set primary office on mount (only on client after mounted)
  // Also auto-select if user has only one office membership
  useEffect(() => {
    if (!mounted || !currentUser || formData.owningOfficeId) return;
    
    // If user has only one office membership, auto-select it
    if (membershipOffices.length === 1) {
      dispatch({
        type: 'UPDATE_FORM_DATA',
        payload: { owningOfficeId: membershipOffices[0].id },
      });
      return;
    }
    
    // Otherwise, try to find primary office membership
    const membership = officeMemberships.find(
      (item) => item.userId === currentUser.id && item.isPrimary && item.isActive
    );
    if (membership?.officeId) {
      dispatch({
        type: 'UPDATE_FORM_DATA',
        payload: { owningOfficeId: membership.officeId },
      });
    }
  }, [mounted, currentUser, officeMemberships, formData.owningOfficeId, membershipOffices]);

  // Update sender name when flow type or office changes
  useEffect(() => {
    if (!mounted) return; // Only run after client mount
    if (flowType !== 'outward') {
      dispatch({
        type: 'UPDATE_FORM_DATA',
        payload: { dispatchDate: '', recipientName: '' },
      });
      return;
    }
    if (!formData.owningOfficeId) return;
    const office = activeOffices.find((entry) => entry.id === formData.owningOfficeId);
    if (!office) return;
    if (!formData.senderName || formData.senderName === office.name) {
      dispatch({ type: 'UPDATE_FORM_DATA', payload: { senderName: office.name || '' } });
    }
  }, [mounted, flowType, formData.owningOfficeId, formData.senderName, activeOffices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (editLoadAbortControllerRef.current) {
        editLoadAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Handlers - MUST be called before any early returns
  const handleFormDataChange = useCallback((updates: Partial<FormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: updates });
  }, []);

  const handleErrorClear = useCallback((field: string) => {
    const newErrors = { ...errors };
    delete newErrors[field];
    dispatch({ type: 'SET_ERRORS', payload: newErrors });
  }, [errors]);

  const handleDistributionChange = useCallback(
    (type: 'directorates' | 'divisions' | 'departments', ids: string[]) => {
      dispatch({ type: 'UPDATE_DISTRIBUTION', payload: { type, ids } });
    },
    []
  );

  const handleDocumentFilesAdd = useCallback((files: File[]) => {
    dispatch({ type: 'ADD_DOCUMENT_FILES', payload: files });
  }, []);

  const handleDocumentFileRemove = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_DOCUMENT_FILE', payload: index });
  }, []);

  const goToNextStep = useCallback(() => {
    if (validateOnStepChange) {
      const stepErrors = validateStep(currentStep, formData, flowType, documentFiles, distributions);
      if (Object.keys(stepErrors).length > 0) {
        dispatch({ type: 'SET_ERRORS', payload: stepErrors });
        toast.error('Please fix the errors in the current step before proceeding');
        return;
      }
    }
    const currentIndex = FORM_STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < FORM_STEPS.length - 1) {
      dispatch({ type: 'SET_STEP', payload: FORM_STEPS[currentIndex + 1].id });
    }
  }, [currentStep, formData, flowType, documentFiles, distributions, validateOnStepChange]);

  const goToPrevStep = useCallback(() => {
    const currentIndex = FORM_STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: FORM_STEPS[currentIndex - 1].id });
    }
  }, [currentStep]);

  const handleSaveDraft = useCallback(() => {
    // Draft is auto-saved, but we can show a toast
    toast.success('Draft saved');
  }, []);

  const handleClearDraft = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const confirmClearDraft = useCallback(() => {
    clearDraft();
    dispatch({ type: 'RESET_FORM', payload: { owningOfficeId: formData.owningOfficeId } });
    dispatch({ type: 'SET_HAS_DRAFT', payload: false });
    setShowResetConfirm(false);
    toast.info('Draft cleared');
  }, [clearDraft, formData.owningOfficeId]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      if (event) event.preventDefault();

      // Validate form
      const validationErrors = validateFormData(formData, flowType, documentFiles, distributions);
      if (Object.keys(validationErrors).length > 0) {
        dispatch({ type: 'SET_ERRORS', payload: validationErrors });
        toast.error('Please fix the errors in the form');

        // Navigate to step with errors
        if (
          validationErrors.subject ||
          validationErrors.owningOfficeId ||
          validationErrors.receivedDate ||
          validationErrors.letterDate ||
          validationErrors.dispatchDate
        ) {
          dispatch({ type: 'SET_STEP', payload: 'basics' });
        } else if (validationErrors.senderName || validationErrors.senderOrganization || validationErrors.recipientName) {
          dispatch({ type: 'SET_STEP', payload: 'sender' });
        } else if (validationErrors.assignTo || validationErrors.distribution) {
          dispatch({ type: 'SET_STEP', payload: 'routing' });
        } else if (validationErrors.documentFiles) {
          dispatch({ type: 'SET_STEP', payload: 'documents' });
        }
        return;
      }

      dispatch({ type: 'SET_SUBMITTING', payload: true });

      // Create AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const formDataToSubmit = buildSubmissionFormData(formData, flowType, documentFiles, distributions);

        // Submit with retry logic - use PATCH for edit, POST for create
        const response = await fetchWithRetry(async () => {
          if (editId) {
            // Update existing correspondence
            return apiFetch<{ id?: string; reference_number?: string }>(
              `/correspondence/items/${editId}/`,
              {
                method: 'PATCH',
                body: formDataToSubmit,
                headers: {},
                signal,
              }
            );
          } else {
            // Create new correspondence
            return apiFetch<{ id?: string; reference_number?: string }>(
              '/correspondence/items/',
              {
                method: 'POST',
                body: formDataToSubmit,
                headers: {},
                signal,
              }
            );
          }
        });

        const correspondenceId = response?.id || editId;

        if (correspondenceId && flowType === 'outward') {
          await createDistributionEntries(
            correspondenceId,
            distributions,
            (path, options) => apiFetch(path, { ...options, signal }),
            logError
          );
        }

        await syncFromApi();
        clearDraft();
        dispatch({ type: 'SET_HAS_DRAFT', payload: false });

        // Reset form only if creating new (not editing)
        if (!editId) {
          dispatch({ type: 'RESET_FORM', payload: { owningOfficeId: formData.owningOfficeId } });
        }

        const referenceNumber = response?.reference_number ?? formData.referenceNumber;
        const successMessage = editId 
          ? 'Correspondence updated successfully' 
          : 'Correspondence registered successfully';
        
        toast.success(successMessage, {
          description: `Reference: ${referenceNumber}`,
          action: {
            label: 'View',
            onClick: () => router.push(`/correspondence/${correspondenceId}`),
          },
        });

        setTimeout(() => {
          // Redirect to outbox if editing, otherwise to detail page
          if (editId) {
            router.push(`/correspondence/outbox/${correspondenceId}`);
          } else {
            router.push(`/correspondence/${correspondenceId}`);
          }
        }, 1500);
      } catch (error: unknown) {
        // Handle authentication errors
        if (handleAuthenticationError(error)) {
          return;
        }

        // Handle abort errors gracefully
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          return;
        }

        const description = (error && typeof error === 'object' && 'message' in error && typeof (error instanceof Error ? error.message : ERROR_UNKNOWN) === 'string') ? (error instanceof Error ? error.message : ERROR_UNKNOWN) : (editId ? 'Unable to update correspondence' : 'Unable to register correspondence');
        toast.error(description);
        logError(editId ? 'Failed to update correspondence' : 'Failed to register correspondence', error);
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
        abortControllerRef.current = null;
      }
    },
    [formData, flowType, documentFiles, distributions, fetchWithRetry, clearDraft, router, syncFromApi, editId]
  );

  // Permission check - MUST be after all hooks but before early returns
  const isSuperAdminFallback = isSuperAdmin;

  const shouldAllowAccess =
    isSuperAdminFallback ||
    permissions.canRegisterCorrespondence ||
    (process.env.NODE_ENV === 'development' && currentUser);

  return (
    <DashboardLayout>
      {!mounted ? (
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
                <div className="h-96 bg-muted animate-pulse rounded-lg" />
              </div>
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      ) : !mounted || !currentUser ? (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying permissions...</p>
            </div>
          </div>
        </div>
      ) : !shouldAllowAccess ? (
        <div className="container mx-auto p-6">
          <Card className="max-w-xl mx-auto">
            <CardHeader className="text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Registration Restricted</CardTitle>
              <CardDescription>
                Only records staff up to Senior Officer (Level 10) or delegates with drafting
                permissions can register new correspondence.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => router.push('/correspondence/inbox')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ErrorBoundary>
          <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            {editId ? 'Edit Correspondence' : 'Register Correspondence'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {editId 
              ? 'Update correspondence details and dispatch'
              : 'Capture and initiate inward or outward correspondence from your office'}
          </p>
        </div>


        <HelpGuideCard
          title="Office-based Registration"
          description="Each executive office retains its own registry workspace. Choose your office, register inward correspondence, or capture drafts before dispatching outward."
          links={[
            { label: "Correspondence Inbox", href: "/correspondence/inbox" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Office & Flow Selection */}
            <OfficeSelectionCard
              offices={filteredOffices}
              selectedOfficeId={formData.owningOfficeId}
              flowType={flowType}
              error={errors.owningOfficeId}
              onOfficeSelect={(officeId) => {
                dispatch({ type: 'UPDATE_FORM_DATA', payload: { owningOfficeId: officeId } });
                if (errors.owningOfficeId) handleErrorClear('owningOfficeId');
              }}
              onFlowTypeChange={(newFlowType) => {
                dispatch({ type: 'SET_FLOW_TYPE', payload: newFlowType });
              }}
            />

            {/* Form Steps */}
            {loadingCorrespondence ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading correspondence...</p>
                </CardContent>
              </Card>
            ) : loadError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <h3 className="text-lg font-semibold mb-2">Failed to Load Correspondence</h3>
                  <p className="text-muted-foreground mb-2">{loadError}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    The correspondence may have been deleted or you may not have permission to edit it.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => router.push('/correspondence/outbox')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Outbox
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setLoadError(null);
                      void loadCorrespondenceForEdit();
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {editId ? 'Edit Correspondence' : 'Registration Details'}
                      </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{completionPercentage}% complete</span>
                    </div>
                  </div>
                  <Progress value={completionPercentage} className="h-1" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs 
                    value={currentStep} 
                    onValueChange={(v) => {
                      const newStep = v as typeof currentStep;
                      if (validateOnStepChange && newStep !== currentStep) {
                        // Validate current step before switching
                        const stepErrors = validateStep(currentStep, formData, flowType, documentFiles, distributions);
                        if (Object.keys(stepErrors).length > 0) {
                          dispatch({ type: 'SET_ERRORS', payload: stepErrors });
                          toast.error('Please fix the errors in the current step before switching tabs');
                          return;
                        }
                      }
                      dispatch({ type: 'SET_STEP', payload: newStep });
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      {FORM_STEPS.map((step) => (
                        <TabsTrigger key={step.id} value={step.id} className="gap-2">
                          {step.id === 'basics' && <FileText className="h-4 w-4" />}
                          {step.id === 'sender' && <Users className="h-4 w-4" />}
                          {step.id === 'routing' && <ArrowRight className="h-4 w-4" />}
                          {step.id === 'documents' && <FolderOpen className="h-4 w-4" />}
                          <span className="hidden sm:inline">{step.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basics" className="space-y-4 pt-4">
                      <BasicInfoStep
                        formData={formData}
                        flowType={flowType}
                        errors={errors}
                        onFormDataChange={handleFormDataChange}
                        onErrorClear={handleErrorClear}
                        onNext={goToNextStep}
                      />
                    </TabsContent>

                    {/* Sender/Recipient Tab */}
                    <TabsContent value="sender" className="space-y-4 pt-4">
                      <PartiesStep
                        formData={formData}
                        flowType={flowType}
                        errors={errors}
                        onFormDataChange={handleFormDataChange}
                        onErrorClear={handleErrorClear}
                        onPrev={goToPrevStep}
                        onNext={goToNextStep}
                      />
                    </TabsContent>

                    {/* Routing Tab */}
                    <TabsContent value="routing" className="space-y-4 pt-4">
                      <RoutingStep
                        formData={formData}
                        flowType={flowType}
                        distributions={distributions}
                        errors={errors}
                        assignSearch={assignSearch}
                        directorates={directorates}
                        divisions={divisions}
                        departments={departments}
                        offices={activeOffices}
                        officeMemberships={officeMemberships}
                        organizationUsers={organizationUsers}
                        onFormDataChange={handleFormDataChange}
                        onDistributionChange={handleDistributionChange}
                        onAssignSearchChange={(search) => {
                          dispatch({ type: 'SET_ASSIGN_SEARCH', payload: search });
                        }}
                        onErrorClear={handleErrorClear}
                        onPrev={goToPrevStep}
                        onNext={goToNextStep}
                      />
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="space-y-4 pt-4">
                      <DocumentsStep
                        formData={formData}
                        documentFiles={documentFiles}
                        errors={errors}
                        submitting={submitting}
                        onFormDataChange={handleFormDataChange}
                        onDocumentFilesAdd={handleDocumentFilesAdd}
                        onDocumentFileRemove={handleDocumentFileRemove}
                        onErrorClear={handleErrorClear}
                        onPrev={goToPrevStep}
                        onSubmit={() => handleSubmit()}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <RegistrationSummary
              formData={formData}
              flowType={flowType}
              documentFiles={documentFiles}
              selectedOfficeName={selectedOfficeName}
              selectedAssigneeName={selectedAssigneeName}
              hasDraft={hasDraft}
              onSaveDraft={handleSaveDraft}
              onClearDraft={handleClearDraft}
              onNavigateToInbox={() => router.push('/correspondence/inbox')}
              onNavigateToRegistered={() => router.push('/correspondence/registered')}
              onNavigateToDMS={() => router.push('/documents')}
            />
          </div>
          </div>
        </div>
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Draft?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all form data and remove the saved draft. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmClearDraft} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Clear Draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ErrorBoundary>
    )}
  </DashboardLayout>
  );
};

const CorrespondenceRegister = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
    <CorrespondenceProvider>
      <CorrespondenceRegisterForm />
    </CorrespondenceProvider>
  </Suspense>
);

export default CorrespondenceRegister;

