"use client";

import { useState, useEffect, useRef } from "react";
import { useAbortController } from "@/hooks/use-abort-controller";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createCase } from "@/lib/api/cases";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import type { Case } from "@/lib/npa-structure";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Save, Loader2, FileText, MoreHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { appType } from "@/lib/app-type";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const caseTypeOptions = [
  { value: "complaint", label: "Complaint" },
  { value: "request", label: "Request" },
  { value: "inquiry", label: "Inquiry" },
  { value: "project", label: "Project" },
  { value: "legal", label: "Legal" },
  { value: "audit", label: "Audit" },
  { value: "general", label: "General" },
] as const;

const priorityOptions = PRIORITY_OPTIONS;

const NewCasePage = () => {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const { divisions, departments, offices } = useOrganization();
  const { getSignal, reset } = useAbortController();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Case>>({
    title: "",
    description: "",
    caseType: "general",
    priority: "medium",
    divisionId: undefined,
    departmentId: undefined,
    owningOfficeId: undefined,
    assignedToId: undefined,
    tags: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved');
  const [hasDraft, setHasDraft] = useState(false);
  const AUTO_SAVE_KEY = 'case-draft-new';
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load draft from localStorage on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        setFormData(draft);
        setAutoSaveStatus('saved');
        setHasDraft(true);
      }
    } catch (err) {
        logError('Failed to load draft', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Auto-save to localStorage
  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set saving status
    setAutoSaveStatus('saving');
    
    // Debounce auto-save (save after 1 second of no changes)
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const hasData = formData.title?.trim() || formData.description?.trim();
        if (hasData) {
          localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(formData));
          setAutoSaveStatus('saved');
          setHasDraft(true);
        } else {
          localStorage.removeItem(AUTO_SAVE_KEY);
          setAutoSaveStatus('unsaved');
          setHasDraft(false);
        }
      } catch (err) {
        logError('Failed to auto-save draft', err);
        setAutoSaveStatus('unsaved');
      }
    }, 1000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);
  
  // Track unsaved changes
  useEffect(() => {
    const hasData = formData.title?.trim() || formData.description?.trim();
    setHasUnsavedChanges(!!hasData);
  }, [formData]);
  
  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser, router]);

  const handleChange = (field: keyof Case, value: Case[keyof Case]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowResetConfirm(true);
    } else {
      router.back();
    }
  };
  
  const handleResetConfirm = () => {
    setFormData({
      title: "",
      description: "",
      caseType: "general",
      priority: "medium",
      divisionId: undefined,
      departmentId: undefined,
      owningOfficeId: undefined,
      assignedToId: undefined,
      tags: [],
    });
    setErrors({});
    setHasUnsavedChanges(false);
    // Clear draft
    localStorage.removeItem(AUTO_SAVE_KEY);
    setAutoSaveStatus('unsaved');
    setShowResetConfirm(false);
    router.back();
  };
  
  const handleLoadDraft = () => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        setFormData(draft);
        setHasDraft(true);
        toast.success("Draft loaded");
      }
    } catch (_err) {
      toast.error("Failed to load draft");
    }
  };
  
  const handleClearDraft = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setAutoSaveStatus('unsaved');
    setHasDraft(false);
    toast.success("Draft cleared");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = "Title is required";
    }

    if (formData.title && formData.title.length > 500) {
      newErrors.title = "Title must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    const signal = getSignal();

    setLoading(true);
    try {
      const newCase = await createCase(formData);
      
      if (signal.aborted) return;
      
      toast.success("Case created successfully");
      setHasUnsavedChanges(false);
      setHasDraft(false);
      setAutoSaveStatus('unsaved');
      await router.push(`/cases/${newCase.id}`);
      localStorage.removeItem(AUTO_SAVE_KEY);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') return;
      logError("Failed to create case", err);
      toast.error("Failed to create case. Please try again.");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };
  


  if (!currentUser?.id) {
    return null;
  }

  // Filter departments based on selected division
  const availableDepartments = formData.divisionId
    ? departments.filter((d) => d.divisionId === formData.divisionId)
    : departments;

  // Filter offices based on selected department
  const availableOffices = formData.departmentId
    ? offices.filter((o) => o.departmentId === formData.departmentId)
    : offices;

  return (
    <ErrorBoundary>
      <>
        <div className="container mx-auto p-4 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className={appType.pageTitleList}>Create New Case</h1>
              </div>
              <p className={appType.pageSubtitle}>
                Track complaints, requests, inquiries, or other matters. A case number is generated on save.
              </p>
              {autoSaveStatus === 'saved' && (
                <p className={`${appType.caption} flex items-center gap-1.5`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Draft auto-saved
                </p>
              )}
              {autoSaveStatus === 'saving' && (
                <p className={`${appType.caption} flex items-center gap-1.5`}>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving draft...
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {hasDraft && (
                  <>
                    <DropdownMenuItem onClick={handleLoadDraft}>
                      Load Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleClearDraft}>
                      Clear Draft
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => router.push('/cases/templates')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 md:p-5 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h2 className={appType.panelTitle}>Basic Information</h2>
                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter case title"
                      value={formData.title || ""}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className={errors.title ? "border-destructive" : ""}
                      maxLength={500}
                      aria-label="Case title"
                      aria-invalid={!!errors.title}
                      aria-describedby={errors.title ? "title-error" : undefined}
                    />
                    <div className="flex items-center justify-between">
                      {errors.title && (
                        <p id="title-error" className="text-sm text-destructive">{errors.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground ml-auto">
                        {(formData.title || "").length} / 500
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter case description (optional)"
                      value={formData.description || ""}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={4}
                      aria-label="Case description"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Classification Section */}
              <div className="space-y-4">
                <h2 className={appType.panelTitle}>Classification</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Case Type */}
                  <div className="space-y-2">
                    <Label htmlFor="caseType">Case Type</Label>
                    <Select
                      value={formData.caseType || "general"}
                      onValueChange={(value) => handleChange("caseType", value)}
                    >
                      <SelectTrigger id="caseType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {caseTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority || "medium"}
                      onValueChange={(value) => handleChange("priority", value)}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Organization Section */}
              <div className="space-y-4">
                <h2 className={appType.panelTitle}>Organization</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Division */}
                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Select
                      value={formData.divisionId || "__none__"}
                      onValueChange={(value) => {
                        handleChange("divisionId", value === "__none__" ? undefined : value);
                        handleChange("departmentId", undefined);
                        handleChange("owningOfficeId", undefined);
                      }}
                    >
                      <SelectTrigger id="division">
                        <SelectValue placeholder="Select division (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {divisions.map((div) => (
                          <SelectItem key={div.id} value={div.id}>
                            {div.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={formData.departmentId || "__none__"}
                      onValueChange={(value) => {
                        handleChange("departmentId", value === "__none__" ? undefined : value);
                        handleChange("owningOfficeId", undefined);
                      }}
                      disabled={!formData.divisionId}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {availableDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Owning Office */}
                  <div className="space-y-2">
                    <Label htmlFor="owningOffice">Owning Office</Label>
                    <Select
                      value={formData.owningOfficeId || "__none__"}
                      onValueChange={(value) => handleChange("owningOfficeId", value === "__none__" ? undefined : value)}
                      disabled={!formData.departmentId}
                    >
                      <SelectTrigger id="owningOffice">
                        <SelectValue placeholder="Select office (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {availableOffices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className={appType.caption}>
                  <span className="text-destructive">*</span> Required fields
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    disabled={loading}
                    aria-label="Cancel case creation"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    size="compact"
                    aria-label="Create case"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Case
                      </>
                    )}
                  </Button>
                </div>
              </div>
          </div>
        </form>
        
        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to leave? All changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowResetConfirm(false)}>
                Keep Editing
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
    </ErrorBoundary>
  );
};

export default NewCasePage;

