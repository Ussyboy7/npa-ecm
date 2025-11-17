"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useTheme } from 'next-themes';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Moon,
  Sun,
  Monitor,
  Save,
  Mail,
  Lock,
  Image as ImageIcon,
  Trash2,
  Upload,
  AlertCircle,
  RefreshCcw,
  Pencil,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch, hasTokens } from '@/lib/api-client';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences as NotificationPreferencesType,
} from '@/lib/notifications-storage';
import {
  loadUserSignature,
  saveUserSignature,
  deleteUserSignature,
  type StoredSignature,
  ensureDefaultSignatureTemplates,
  saveSignatureTemplates,
  loadUserSignaturePreferences,
  saveUserSignaturePreferences,
  type SignatureTemplate,
  type UserSignaturePreferences,
  DEFAULT_SIGNATURE_TEMPLATES,
} from '@/lib/signature-storage';

const MAX_SIGNATURE_SIZE_MB = 2;
type SignatureTemplateType = SignatureTemplate['templateType'];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validation helpers
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, refresh: refreshUser } = useCurrentUser();
  
  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferencesType | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Signature state
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [signatureTemplates, setSignatureTemplates] = useState<SignatureTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<SignatureTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteSignatureDialog, setShowDeleteSignatureDialog] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'signature'>('profile');

  const defaultPreferences: UserSignaturePreferences = {
    templateOverrides: {},
    autoApplyForMinutes: false,
  };

  const [signaturePreferences, setSignaturePreferences] = useState<UserSignaturePreferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] = useState<UserSignaturePreferences>(defaultPreferences);

  const templateTypes: SignatureTemplateType[] = ['approval', 'minute', 'forward', 'treatment'];
  const hasPreferenceChanges = JSON.stringify(signaturePreferences) !== JSON.stringify(initialPreferences);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!hasTokens() || !currentUser) return;
      
      try {
        const userData = await apiFetch<{
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
        }>('/accounts/auth/me/');
        setProfile({
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '', // Note: phone might not be in User model
        });
      } catch (error) {
        logError('Failed to load user profile', error);
      }
    };
    
    if (currentUser) {
      void loadProfile();
    }
  }, [currentUser]);

  // Helper to convert backend snake_case to frontend camelCase
  const convertBackendToFrontend = (backend: any): NotificationPreferencesType | null => {
    if (!backend) return null;
    return {
      id: backend.id,
      user: backend.user,
      inAppEnabled: backend.in_app_enabled ?? backend.inAppEnabled ?? true,
      inAppUrgentOnly: backend.in_app_urgent_only ?? backend.inAppUrgentOnly ?? false,
      emailEnabled: backend.email_enabled ?? backend.emailEnabled ?? true,
      emailUrgentOnly: backend.email_urgent_only ?? backend.emailUrgentOnly ?? false,
      emailDigest: backend.email_digest ?? backend.emailDigest ?? false,
      emailDigestTime: backend.email_digest_time ?? backend.emailDigestTime,
      moduleDms: backend.module_dms ?? backend.moduleDms ?? true,
      moduleCorrespondence: backend.module_correspondence ?? backend.moduleCorrespondence ?? true,
      moduleWorkflow: backend.module_workflow ?? backend.moduleWorkflow ?? true,
      moduleSystem: backend.module_system ?? backend.moduleSystem ?? true,
      priorityLow: backend.priority_low ?? backend.priorityLow ?? true,
      priorityNormal: backend.priority_normal ?? backend.priorityNormal ?? true,
      priorityHigh: backend.priority_high ?? backend.priorityHigh ?? true,
      priorityUrgent: backend.priority_urgent ?? backend.priorityUrgent ?? true,
      typeWorkflow: backend.type_workflow ?? backend.typeWorkflow ?? true,
      typeDocument: backend.type_document ?? backend.typeDocument ?? true,
      typeCorrespondence: backend.type_correspondence ?? backend.typeCorrespondence ?? true,
      typeSystem: backend.type_system ?? backend.typeSystem ?? true,
      typeAlert: backend.type_alert ?? backend.typeAlert ?? true,
      typeReminder: backend.type_reminder ?? backend.typeReminder ?? true,
      quietHoursEnabled: backend.quiet_hours_enabled ?? backend.quietHoursEnabled ?? false,
      quietHoursStart: backend.quiet_hours_start ?? backend.quietHoursStart,
      quietHoursEnd: backend.quiet_hours_end ?? backend.quietHoursEnd,
      autoArchiveDays: backend.auto_archive_days ?? backend.autoArchiveDays ?? 30,
      createdAt: backend.created_at ?? backend.createdAt ?? new Date().toISOString(),
      updatedAt: backend.updated_at ?? backend.updatedAt ?? new Date().toISOString(),
    };
  };

  // Helper to convert frontend camelCase to backend snake_case
  const convertFrontendToBackend = (frontend: NotificationPreferencesType): any => {
    return {
      in_app_enabled: frontend.inAppEnabled,
      in_app_urgent_only: frontend.inAppUrgentOnly,
      email_enabled: frontend.emailEnabled,
      email_urgent_only: frontend.emailUrgentOnly,
      email_digest: frontend.emailDigest,
      email_digest_time: frontend.emailDigestTime,
      module_dms: frontend.moduleDms,
      module_correspondence: frontend.moduleCorrespondence,
      module_workflow: frontend.moduleWorkflow,
      module_system: frontend.moduleSystem,
      priority_low: frontend.priorityLow,
      priority_normal: frontend.priorityNormal,
      priority_high: frontend.priorityHigh,
      priority_urgent: frontend.priorityUrgent,
      type_workflow: frontend.typeWorkflow,
      type_document: frontend.typeDocument,
      type_correspondence: frontend.typeCorrespondence,
      type_system: frontend.typeSystem,
      type_alert: frontend.typeAlert,
      type_reminder: frontend.typeReminder,
      quiet_hours_enabled: frontend.quietHoursEnabled,
      quiet_hours_start: frontend.quietHoursStart,
      quiet_hours_end: frontend.quietHoursEnd,
      auto_archive_days: frontend.autoArchiveDays,
    };
  };

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (!hasTokens()) {
        setIsLoadingNotifications(false);
        return;
      }
      
      setIsLoadingNotifications(true);
      try {
        const prefs = await getNotificationPreferences();
        if (prefs) {
          // Convert in case backend returns snake_case
          const converted = convertBackendToFrontend(prefs as any);
          if (converted) {
            setNotificationPrefs(converted);
          }
        }
      } catch (error) {
        logError('Failed to load notification preferences', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoadingNotifications(false);
      }
    };
    
    void loadNotificationPreferences();
  }, []);

  // Load signature data
  useEffect(() => {
    const defaults = ensureDefaultSignatureTemplates();
    setSignatureTemplates(defaults);

    if (currentUser?.id) {
      const storedSignature = loadUserSignature(currentUser.id);
      if (storedSignature) {
        setSignature(storedSignature);
      }
      const prefs = loadUserSignaturePreferences(currentUser.id) ?? defaultPreferences;
      const normalizedPrefs: UserSignaturePreferences = {
        templateOverrides: { ...(prefs.templateOverrides ?? {}) },
        autoApplyForMinutes: prefs.autoApplyForMinutes ?? false,
      };
      setSignaturePreferences(normalizedPrefs);
      setInitialPreferences({
        templateOverrides: { ...normalizedPrefs.templateOverrides },
        autoApplyForMinutes: normalizedPrefs.autoApplyForMinutes,
      });
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'notifications' || hash === 'appearance' || hash === 'security' || hash === 'signature' || hash === 'profile') {
      setActiveTab(hash as typeof activeTab);
    }
  }, []);

  const handleSaveProfile = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    const emailError = validateEmail(profile.email);
    if (emailError) errors.email = emailError;
    
    const phoneError = validatePhone(profile.phone);
    if (phoneError) errors.phone = phoneError;
    
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error('Please fix the errors before saving');
      return;
    }
    
    setProfileErrors({});
    setIsSavingProfile(true);
    
    try {
      await apiFetch('/accounts/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: profile.firstName,
          last_name: profile.lastName,
          email: profile.email,
        }),
      });
      
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      logError('Failed to save profile', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notificationPrefs) {
      toast.error('Notification preferences not loaded');
      return;
    }
    
    setIsSavingNotifications(true);
    
    try {
      // Convert to backend format
      const backendData = convertFrontendToBackend(notificationPrefs);
      const response = await apiFetch('/notifications/preferences/', {
        method: 'PUT',
        body: JSON.stringify(backendData),
      });
      // Convert response back to frontend format
      const converted = convertBackendToFrontend(response);
      if (converted) {
        setNotificationPrefs(converted);
      }
      toast.success('Notification preferences saved');
    } catch (error) {
      logError('Failed to save notification preferences', error);
      toast.error('Failed to save notification preferences. Please try again.');
    } finally {
      setIsSavingNotifications(false);
    }
  };
  
  const handleChangePassword = async () => {
    // Validate passwords
    const errors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    const newPasswordError = validatePassword(passwordData.newPassword);
    if (newPasswordError) {
      errors.newPassword = newPasswordError;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setPasswordErrors({});
    setIsChangingPassword(true);
    
    try {
      await apiFetch('/accounts/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
          confirm_password: passwordData.confirmPassword,
        }),
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordDialog(false);
    } catch (error: any) {
      logError('Failed to change password', error);
      const errorData = error?.response?.data || error?.data || {};
      const errorMessage = errorData.current_password || errorData.new_password || errorData.detail || 'Failed to change password';
      toast.error(errorMessage);
      setPasswordErrors(errorData);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.id) {
      toast.error('No active user context found');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, or SVG)');
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
      toast.error(`Signature file size must be ${MAX_SIGNATURE_SIZE_MB}MB or less`);
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await fileToBase64(file);
      const stored: StoredSignature = {
        imageData: base64,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      saveUserSignature(currentUser.id, stored);
      setSignature(stored);
      toast.success('Signature uploaded successfully');
    } catch (error) {
      logError('Failed to upload signature', error);
      toast.error('Failed to upload signature');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignatureDelete = () => {
    if (!currentUser?.id) return;
    deleteUserSignature(currentUser.id);
    setSignature(null);
    setShowDeleteSignatureDialog(false);
    toast.success('Signature removed');
  };

  const handleTemplateOverrideChange = (type: SignatureTemplateType, value: string) => {
    setSignaturePreferences(prev => {
      const overrides = { ...(prev.templateOverrides ?? {}) };
      if (value === '__organization__') {
        delete overrides[type];
      } else {
        overrides[type] = value;
      }
      return { ...prev, templateOverrides: overrides };
    });
  };

  const handleAutoApplyMinutesChange = (checked: boolean) => {
    setSignaturePreferences(prev => ({ ...prev, autoApplyForMinutes: checked }));
  };

  const handleSavePersonalPreferences = () => {
    if (!currentUser?.id) {
      toast.error('No active user context found');
      return;
    }
    const normalized: UserSignaturePreferences = {
      templateOverrides: { ...(signaturePreferences.templateOverrides ?? {}) },
      autoApplyForMinutes: signaturePreferences.autoApplyForMinutes ?? false,
    };
    saveUserSignaturePreferences(currentUser.id, normalized);
    setSignaturePreferences(normalized);
    setInitialPreferences({
      templateOverrides: { ...normalized.templateOverrides },
      autoApplyForMinutes: normalized.autoApplyForMinutes,
    });
    toast.success('Personal signature preferences saved');
  };

  const handleResetPersonalPreferences = () => {
    if (!currentUser?.id) {
      toast.error('No active user context found');
      return;
    }
    const resetPrefs: UserSignaturePreferences = {
      templateOverrides: {},
      autoApplyForMinutes: false,
    };
    setSignaturePreferences(resetPrefs);
    setInitialPreferences({ ...resetPrefs, templateOverrides: {} });
    saveUserSignaturePreferences(currentUser.id, resetPrefs);
    toast.success('Personal signature preferences reset');
  };

  const beginEditTemplate = (template: SignatureTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateDraft({ ...template });
  };

  const cancelEditTemplate = () => {
    setEditingTemplateId(null);
    setTemplateDraft(null);
  };

  const updateTemplateDraft = (field: keyof SignatureTemplate, value: string | boolean) => {
    if (!templateDraft) return;
    setTemplateDraft({ ...templateDraft, [field]: value } as SignatureTemplate);
  };

  const saveTemplateChanges = () => {
    if (!templateDraft) return;
    const updatedTemplates = signatureTemplates.map(template =>
      template.id === templateDraft.id ? templateDraft : template
    );
    setSignatureTemplates(updatedTemplates);
    saveSignatureTemplates(updatedTemplates);
    toast.success('Template updated');
    cancelEditTemplate();
  };

  const resetOrganizationTemplates = () => {
    saveSignatureTemplates(DEFAULT_SIGNATURE_TEMPLATES);
    setSignatureTemplates([...DEFAULT_SIGNATURE_TEMPLATES]);
    cancelEditTemplate();
    toast.success('Organization templates reset to defaults');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <HelpGuideCard
          title="Personalise Your Workspace"
          description="Update profile details, notifications, appearance, security options, and digital signature templates. Changes apply to the current persona stored in the Role Switcher."
          links={[
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <Tabs value={activeTab} onValueChange={(tab: string) => {
          const newTab = tab as typeof activeTab;
          setActiveTab(newTab);
          if (typeof window !== 'undefined') {
            const { pathname } = window.location;
            const newHash = newTab === 'profile' ? '' : `#${newTab}`;
            window.history.replaceState(null, '', `${pathname}${newHash}`);
          }
        }} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="signature">
              <ImageIcon className="h-4 w-4 mr-2" />
              Signature
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information. Changes will be saved to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="Enter your first name"
                      value={profile.firstName}
                      onChange={(e) => {
                        setProfile({ ...profile, firstName: e.target.value });
                        if (profileErrors.firstName) {
                          setProfileErrors({ ...profileErrors, firstName: '' });
                        }
                      }}
                      aria-label="First name"
                      aria-required="true"
                      aria-invalid={!!profileErrors.firstName}
                      aria-describedby={profileErrors.firstName ? "firstName-error" : undefined}
                    />
                    {profileErrors.firstName && (
                      <p id="firstName-error" className="text-sm text-destructive" role="alert">
                        {profileErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="Enter your last name"
                      value={profile.lastName}
                      onChange={(e) => {
                        setProfile({ ...profile, lastName: e.target.value });
                        if (profileErrors.lastName) {
                          setProfileErrors({ ...profileErrors, lastName: '' });
                        }
                      }}
                      aria-label="Last name"
                      aria-required="true"
                      aria-invalid={!!profileErrors.lastName}
                      aria-describedby={profileErrors.lastName ? "lastName-error" : undefined}
                    />
                    {profileErrors.lastName && (
                      <p id="lastName-error" className="text-sm text-destructive" role="alert">
                        {profileErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={profile.email}
                    onChange={(e) => {
                      setProfile({ ...profile, email: e.target.value });
                      if (profileErrors.email) {
                        setProfileErrors({ ...profileErrors, email: '' });
                      }
                    }}
                    aria-label="Email address"
                    aria-required="true"
                    aria-invalid={!!profileErrors.email}
                    aria-describedby={profileErrors.email ? "email-error" : undefined}
                  />
                  {profileErrors.email && (
                    <p id="email-error" className="text-sm text-destructive" role="alert">
                      {profileErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number"
                    value={profile.phone}
                    onChange={(e) => {
                      setProfile({ ...profile, phone: e.target.value });
                      if (profileErrors.phone) {
                        setProfileErrors({ ...profileErrors, phone: '' });
                      }
                    }}
                    aria-label="Phone number"
                    aria-invalid={!!profileErrors.phone}
                    aria-describedby={profileErrors.phone ? "phone-error" : undefined}
                  />
                  {profileErrors.phone && (
                    <p id="phone-error" className="text-sm text-destructive" role="alert">
                      {profileErrors.phone}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleSaveProfile} 
                  className="w-full sm:w-auto"
                  disabled={isSavingProfile}
                  aria-label="Save profile changes"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about correspondence, approvals, and system updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading preferences...</span>
                  </div>
                ) : !notificationPrefs ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Unable to load notification preferences.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                      void (async () => {
                        setIsLoadingNotifications(true);
                        try {
                          const prefs = await getNotificationPreferences();
                          if (prefs) setNotificationPrefs(prefs);
                        } catch (error) {
                          logError('Failed to reload preferences', error);
                        } finally {
                          setIsLoadingNotifications(false);
                        }
                      })();
                    }}>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-3">In-App Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="in-app-enabled" aria-label="Enable in-app notifications">
                                In-App Notifications
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications within the application
                              </p>
                            </div>
                            <Switch
                              id="in-app-enabled"
                              checked={notificationPrefs.inAppEnabled ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, inAppEnabled: checked })
                              }
                              aria-label="Toggle in-app notifications"
                            />
                          </div>
                          {notificationPrefs.inAppEnabled && (
                            <div className="flex items-center justify-between pl-6">
                              <div className="space-y-0.5">
                                <Label htmlFor="in-app-urgent-only" className="text-sm">
                                  Urgent Only
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Only show urgent priority notifications
                                </p>
                              </div>
                              <Switch
                                id="in-app-urgent-only"
                                checked={notificationPrefs.inAppUrgentOnly ?? false}
                                onCheckedChange={(checked) =>
                                  setNotificationPrefs({ ...notificationPrefs, inAppUrgentOnly: checked })
                                }
                                aria-label="Toggle urgent-only in-app notifications"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Email Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="email-enabled" aria-label="Enable email notifications">
                                Email Notifications
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications via email
                              </p>
                            </div>
                            <Switch
                              id="email-enabled"
                              checked={notificationPrefs.emailEnabled ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, emailEnabled: checked })
                              }
                              aria-label="Toggle email notifications"
                            />
                          </div>
                          {notificationPrefs.emailEnabled && (
                            <>
                              <div className="flex items-center justify-between pl-6">
                                <div className="space-y-0.5">
                                  <Label htmlFor="email-urgent-only" className="text-sm">
                                    Urgent Only
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    Only send emails for urgent priority notifications
                                  </p>
                                </div>
                                <Switch
                                  id="email-urgent-only"
                                  checked={notificationPrefs.emailUrgentOnly ?? false}
                                  onCheckedChange={(checked) =>
                                    setNotificationPrefs({ ...notificationPrefs, emailUrgentOnly: checked })
                                  }
                                  aria-label="Toggle urgent-only email notifications"
                                />
                              </div>
                              <div className="flex items-center justify-between pl-6">
                                <div className="space-y-0.5">
                                  <Label htmlFor="email-digest" className="text-sm">
                                    Daily Digest
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    Receive a daily summary instead of individual emails
                                  </p>
                                </div>
                                <Switch
                                  id="email-digest"
                                  checked={notificationPrefs.emailDigest ?? false}
                                  onCheckedChange={(checked) =>
                                    setNotificationPrefs({ ...notificationPrefs, emailDigest: checked })
                                  }
                                  aria-label="Toggle daily email digest"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Module Filters</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="module-correspondence" className="text-sm font-normal">
                              Correspondence
                            </Label>
                            <Switch
                              id="module-correspondence"
                              checked={notificationPrefs.moduleCorrespondence ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleCorrespondence: checked })
                              }
                              aria-label="Toggle correspondence notifications"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="module-dms" className="text-sm font-normal">
                              Document Management
                            </Label>
                            <Switch
                              id="module-dms"
                              checked={notificationPrefs.moduleDms ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleDms: checked })
                              }
                              aria-label="Toggle DMS notifications"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="module-workflow" className="text-sm font-normal">
                              Workflow
                            </Label>
                            <Switch
                              id="module-workflow"
                              checked={notificationPrefs.moduleWorkflow ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleWorkflow: checked })
                              }
                              aria-label="Toggle workflow notifications"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="module-system" className="text-sm font-normal">
                              System
                            </Label>
                            <Switch
                              id="module-system"
                              checked={notificationPrefs.moduleSystem ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleSystem: checked })
                              }
                              aria-label="Toggle system notifications"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <Button 
                      onClick={handleSaveNotifications} 
                      className="w-full sm:w-auto"
                      disabled={isSavingNotifications}
                      aria-label="Save notification preferences"
                    >
                      {isSavingNotifications ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Color Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-6 w-6" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-6 w-6" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="h-6 w-6" />
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Change your password to keep your account secure. Use a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    name="current-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                      }
                    }}
                    aria-label="Current password"
                    aria-required="true"
                    aria-invalid={!!passwordErrors.currentPassword}
                    aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                  />
                  {passwordErrors.currentPassword && (
                    <p id="current-password-error" className="text-sm text-destructive" role="alert">
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({ ...passwordErrors, newPassword: '' });
                      }
                    }}
                    aria-label="New password"
                    aria-required="true"
                    aria-invalid={!!passwordErrors.newPassword}
                    aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
                  />
                  {passwordErrors.newPassword && (
                    <p id="new-password-error" className="text-sm text-destructive" role="alert">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters and include uppercase, lowercase, and numbers.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                      }
                    }}
                    aria-label="Confirm new password"
                    aria-required="true"
                    aria-invalid={!!passwordErrors.confirmPassword}
                    aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                  />
                  {passwordErrors.confirmPassword && (
                    <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-full sm:w-auto"
                  disabled={isChangingPassword}
                  aria-label="Change password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>
            
            {/* Password Change Confirmation Dialog */}
            <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change Password</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to change your password? You will need to use your new password to log in next time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isChangingPassword}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-primary text-primary-foreground"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Upload and manage your digital signature. A signature is required for all approvals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 border border-dashed rounded-lg bg-muted/30">
                  <AlertCircle className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Supported formats: <strong>PNG, JPG, SVG</strong> • Max size: <strong>{MAX_SIGNATURE_SIZE_MB}MB</strong>
                    </p>
                    <p>
                      Your signature will be stored locally for now and will migrate to secure backend storage when available.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signature-upload">Upload Signature</Label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Input
                        id="signature-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleSignatureUpload}
                        disabled={isUploading}
                      />
                      <Button variant="outline" className="gap-2" disabled={isUploading}>
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Select File'}
                      </Button>
                    </div>
                  </div>

                  {signature && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Current Signature</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(signature.uploadedAt).toLocaleString()} {signature.fileName ? `• ${signature.fileName}` : ''}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="gap-2" 
                          onClick={() => setShowDeleteSignatureDialog(true)}
                          aria-label="Delete signature"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg bg-background flex items-center justify-center">
                        <img
                          src={signature.imageData}
                          alt="Digital signature preview"
                          className="max-h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {!signature && (
                    <div className="p-4 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      No signature uploaded yet. Please add your signature to approve correspondence.
                    </div>
                  )}

                  <Tabs className="space-y-4" defaultValue="personal">
                    <TabsList>
                      <TabsTrigger value="personal">My Templates</TabsTrigger>
                      <TabsTrigger value="organization">Organization Templates</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal">
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                          Choose your preferred templates for each action. You can fall back to the organization default at any time.
                        </p>
                        <div className="space-y-4">
                          {templateTypes.map((type) => {
                            const templatesForType = signatureTemplates.filter(template => template.templateType === type);
                            const organizationDefault = signatureTemplates.find(template => template.templateType === type && template.defaultApply) ?? templatesForType[0] ?? null;
                            const selectedValue = signaturePreferences.templateOverrides?.[type] ?? '__organization__';
                            return (
                              <Card key={type} className="border-muted">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm capitalize">{type} Template</CardTitle>
                                  <CardDescription className="text-xs">
                                    {type === 'approval' && 'Used whenever you approve and forward correspondence.'}
                                    {type === 'minute' && 'Used when you leave a comment/minute without approving.'}
                                    {type === 'forward' && 'Used when you manually forward correspondence.'}
                                    {type === 'treatment' && 'Used when you treat/respond to correspondence.'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {templatesForType.length > 0 ? (
                                    <Select
                                      value={selectedValue}
                                      onValueChange={(value) => handleTemplateOverrideChange(type, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__organization__">
                                          <div className="flex flex-col text-xs">
                                            <span className="font-medium text-foreground">Use organization default</span>
                                            <span className="text-muted-foreground">
                                              {organizationDefault ? organizationDefault.name : 'No default configured'}
                                            </span>
                                          </div>
                                        </SelectItem>
                                        {templatesForType.map(template => (
                                          <SelectItem key={template.id} value={template.id}>
                                            <div className="flex flex-col text-xs">
                                              <span className="font-medium text-foreground">{template.name}</span>
                                              <span className="text-muted-foreground">{template.description}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="p-3 border border-dashed rounded bg-muted/30 text-xs text-muted-foreground">
                                      No templates available for this action yet.
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={signaturePreferences.autoApplyForMinutes ?? false}
                              onCheckedChange={handleAutoApplyMinutesChange}
                            />
                            <span>Automatically apply signature to minutes (when not approving)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleResetPersonalPreferences} disabled={!hasPreferenceChanges || !currentUser?.id}>
                              Reset
                            </Button>
                            <Button size="sm" onClick={handleSavePersonalPreferences} disabled={!hasPreferenceChanges || !currentUser?.id}>
                              Save Preferences
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="organization">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          Organization-wide templates are the defaults applied across all users.
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" onClick={resetOrganizationTemplates}>
                          <RefreshCcw className="h-4 w-4" />
                          Reset to Default
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {signatureTemplates.map(template => {
                          const isEditing = editingTemplateId === template.id;
                          const draft = isEditing ? templateDraft : template;
                          return (
                            <Card key={template.id} className="border-muted">
                              <CardHeader className="space-y-1">
                                <div className="flex items-center justify-between">
                                  {isEditing ? (
                                    <Input
                                      value={draft?.name ?? ''}
                                      onChange={(e) => updateTemplateDraft('name', e.target.value)}
                                      className="text-sm font-semibold"
                                    />
                                  ) : (
                                    <CardTitle className="text-sm">{template.name}</CardTitle>
                                  )}
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {draft?.templateType}
                                  </Badge>
                                </div>
                                {isEditing ? (
                                  <Textarea
                                    value={draft?.description ?? ''}
                                    onChange={(e) => updateTemplateDraft('description', e.target.value)}
                                    className="text-xs"
                                    rows={2}
                                  />
                                ) : (
                                  <CardDescription className="text-xs">
                                    {template.description}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Format Preview</Label>
                                  {isEditing ? (
                                    <Textarea
                                      value={draft?.format ?? ''}
                                      onChange={(e) => updateTemplateDraft('format', e.target.value)}
                                      className="text-xs font-mono"
                                      rows={4}
                                    />
                                  ) : (
                                    <div className="p-3 rounded bg-muted/30 border border-dashed">
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                                        {template.format}
                                      </p>
                                    </div>
                                  )}
                                  {isEditing && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Use placeholders such as {'{name}'}, {'{title}'}, {'{gradeLevel}'}, {'{division}'}, {'{department}'}, {'{initials}'}, {'{date}'}, {'{dateTime}'}, {'{referenceNumber}'}.
                                    </p>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Template Type</Label>
                                    {isEditing ? (
                                      <Select
                                        value={draft?.templateType}
                                        onValueChange={(value) => updateTemplateDraft('templateType', value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="approval">Approval</SelectItem>
                                          <SelectItem value="minute">Minute</SelectItem>
                                          <SelectItem value="forward">Forward</SelectItem>
                                          <SelectItem value="treatment">Treatment</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="capitalize">{template.templateType}</span>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Style</Label>
                                    {isEditing ? (
                                      <Select
                                        value={draft?.style}
                                        onValueChange={(value) => updateTemplateDraft('style', value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="stamp">Stamp</SelectItem>
                                          <SelectItem value="formal">Formal</SelectItem>
                                          <SelectItem value="minimal">Minimal</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="capitalize">{template.style}</span>
                                    )}
                                  </div>
                                  <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <Label className="text-xs text-muted-foreground">Auto Apply</Label>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={draft?.defaultApply ?? false}
                                        onCheckedChange={(checked) => updateTemplateDraft('defaultApply', checked)}
                                        disabled={!isEditing}
                                      />
                                      <span className="text-xs">
                                        {draft?.defaultApply ? 'Automatically applied during workflow' : 'User can choose to apply manually'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground">ID: {template.id}</span>
                                  {isEditing ? (
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="gap-1" onClick={cancelEditTemplate}>
                                        <X className="h-3 w-3" />
                                        Cancel
                                      </Button>
                                      <Button size="sm" className="gap-1" onClick={saveTemplateChanges}>
                                        <Check className="h-3 w-3" />
                                        Save
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => beginEditTemplate(template)}>
                                      <Pencil className="h-3 w-3" />
                                      Edit Template
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Signature Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteSignatureDialog} onOpenChange={setShowDeleteSignatureDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Signature</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove your digital signature? You will need to upload a new signature to approve correspondence.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignatureDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Signature
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
