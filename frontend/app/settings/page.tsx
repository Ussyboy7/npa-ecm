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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Loader2,
  Smartphone,
  Key,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Volume2,
  VolumeX,
  Building2,
  Briefcase,
  Camera,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Download,
  FileText,
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
const MAX_PHOTO_SIZE_MB = 5;
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
  if (!phone) return null;
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

// Generate mock backup codes
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
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
    bio: '',
    jobTitle: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  
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
          bio?: string;
          job_title?: string;
          profile_photo?: string;
        }>('/accounts/auth/me/');
        setProfile({
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          jobTitle: userData.job_title || currentUser.systemRole || '',
        });
        if (userData.profile_photo) {
          setProfilePhoto(userData.profile_photo);
        }
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
      quietHoursStart: backend.quiet_hours_start ?? backend.quietHoursStart ?? '22:00',
      quietHoursEnd: backend.quiet_hours_end ?? backend.quietHoursEnd ?? '07:00',
      autoArchiveDays: backend.auto_archive_days ?? backend.autoArchiveDays ?? 30,
      soundEnabled: backend.sound_enabled ?? backend.soundEnabled ?? true,
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
      sound_enabled: frontend.soundEnabled,
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

  // Profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, or WebP)');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo must be ${MAX_PHOTO_SIZE_MB}MB or less`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const base64 = await fileToBase64(file);
      setProfilePhoto(base64);
      toast.success('Profile photo updated');
    } catch (error) {
      logError('Failed to upload photo', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
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
          bio: profile.bio,
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
      const backendData = convertFrontendToBackend(notificationPrefs);
      const response = await apiFetch('/notifications/preferences/', {
        method: 'PUT',
        body: JSON.stringify(backendData),
      });
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

  // 2FA handlers
  const handleSetup2FA = () => {
    // Generate mock secret and QR code
    const secret = 'JBSWY3DPEHPK3PXP'; // Mock secret
    setTwoFactorSecret(secret);
    setTwoFactorQRCode(`otpauth://totp/NPA-ECM:${profile.email}?secret=${secret}&issuer=NPA-ECM`);
    setShowSetup2FA(true);
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsEnabling2FA(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      setTwoFactorEnabled(true);
      setShowSetup2FA(false);
      setShowBackupCodes(true);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      logError('Failed to enable 2FA', error);
      toast.error('Failed to verify code. Please try again.');
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTwoFactorEnabled(false);
      setBackupCodes([]);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      logError('Failed to disable 2FA', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleRegenerateBackupCodes = () => {
    const codes = generateBackupCodes();
    setBackupCodes(codes);
    toast.success('New backup codes generated');
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };
  
  const handleChangePassword = async () => {
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

  const userInitials = currentUser
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U';

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <HelpGuideCard
          title="Personalise Your Workspace"
          description="Update profile details, notifications, appearance, security options, and digital signature templates."
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
            {/* Profile Photo & Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and profile photo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profilePhoto || undefined} alt="Profile photo" />
                      <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span>{profile.jobTitle || currentUser?.systemRole || 'No title set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{currentUser?.division || currentUser?.department || 'No department'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={profile.firstName}
                      onChange={(e) => {
                        setProfile({ ...profile, firstName: e.target.value });
                        if (profileErrors.firstName) {
                          setProfileErrors({ ...profileErrors, firstName: '' });
                        }
                      }}
                    />
                    {profileErrors.firstName && (
                      <p className="text-sm text-destructive">{profileErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={profile.lastName}
                      onChange={(e) => {
                        setProfile({ ...profile, lastName: e.target.value });
                        if (profileErrors.lastName) {
                          setProfileErrors({ ...profileErrors, lastName: '' });
                        }
                      }}
                    />
                    {profileErrors.lastName && (
                      <p className="text-sm text-destructive">{profileErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={profile.email}
                    onChange={(e) => {
                      setProfile({ ...profile, email: e.target.value });
                      if (profileErrors.email) {
                        setProfileErrors({ ...profileErrors, email: '' });
                      }
                    }}
                  />
                  {profileErrors.email && (
                    <p className="text-sm text-destructive">{profileErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={profile.phone}
                    onChange={(e) => {
                      setProfile({ ...profile, phone: e.target.value });
                      if (profileErrors.phone) {
                        setProfileErrors({ ...profileErrors, phone: '' });
                      }
                    }}
                  />
                  {profileErrors.phone && (
                    <p className="text-sm text-destructive">{profileErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself..."
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">{profile.bio.length}/500 characters</p>
                </div>

                {/* Read-only Organization Info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Organization Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Job Title</p>
                      <p className="font-medium">{currentUser?.systemRole || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Grade Level</p>
                      <p className="font-medium">{currentUser?.gradeLevel || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Division</p>
                      <p className="font-medium">{currentUser?.division || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{currentUser?.department || 'Not assigned'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Contact your administrator to update organization details.</p>
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSavingProfile}
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
                          if (prefs) setNotificationPrefs(convertBackendToFrontend(prefs as any));
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
                    {/* In-App Notifications */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">In-App Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                            <Label>In-App Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive notifications within the application</p>
                            </div>
                            <Switch
                              checked={notificationPrefs.inAppEnabled ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, inAppEnabled: checked })
                              }
                            />
                          </div>
                          {notificationPrefs.inAppEnabled && (
                          <>
                            <div className="flex items-center justify-between pl-6">
                              <div className="space-y-0.5">
                                <Label className="text-sm">Urgent Only</Label>
                                <p className="text-xs text-muted-foreground">Only show urgent priority notifications</p>
                              </div>
                              <Switch
                                checked={notificationPrefs.inAppUrgentOnly ?? false}
                                onCheckedChange={(checked) =>
                                  setNotificationPrefs({ ...notificationPrefs, inAppUrgentOnly: checked })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between pl-6">
                              <div className="space-y-0.5">
                                <Label className="text-sm flex items-center gap-2">
                                  <Volume2 className="h-4 w-4" /> Sound
                                </Label>
                                <p className="text-xs text-muted-foreground">Play sound for new notifications</p>
                              </div>
                              <Switch
                                checked={notificationPrefs.soundEnabled ?? true}
                                onCheckedChange={(checked) =>
                                  setNotificationPrefs({ ...notificationPrefs, soundEnabled: checked })
                                }
                              />
                            </div>
                          </>
                          )}
                        </div>
                      </div>

                      <Separator />

                    {/* Email Notifications */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Email Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                            </div>
                            <Switch
                              checked={notificationPrefs.emailEnabled ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, emailEnabled: checked })
                              }
                            />
                          </div>
                          {notificationPrefs.emailEnabled && (
                            <>
                              <div className="flex items-center justify-between pl-6">
                                <div className="space-y-0.5">
                                <Label className="text-sm">Urgent Only</Label>
                                <p className="text-xs text-muted-foreground">Only send emails for urgent priority</p>
                                </div>
                                <Switch
                                  checked={notificationPrefs.emailUrgentOnly ?? false}
                                  onCheckedChange={(checked) =>
                                    setNotificationPrefs({ ...notificationPrefs, emailUrgentOnly: checked })
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between pl-6">
                                <div className="space-y-0.5">
                                <Label className="text-sm">Daily Digest</Label>
                                <p className="text-xs text-muted-foreground">Receive a daily summary instead of individual emails</p>
                                </div>
                                <Switch
                                  checked={notificationPrefs.emailDigest ?? false}
                                  onCheckedChange={(checked) =>
                                    setNotificationPrefs({ ...notificationPrefs, emailDigest: checked })
                                  }
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <Separator />

                    {/* Quiet Hours */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Quiet Hours
                      </h3>
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Enable Quiet Hours</Label>
                            <p className="text-sm text-muted-foreground">Pause non-urgent notifications during set hours</p>
                          </div>
                            <Switch
                            checked={notificationPrefs.quietHoursEnabled ?? false}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs({ ...notificationPrefs, quietHoursEnabled: checked })
                            }
                          />
                        </div>
                        {notificationPrefs.quietHoursEnabled && (
                          <div className="grid grid-cols-2 gap-4 pl-6">
                            <div className="space-y-2">
                              <Label className="text-sm">Start Time</Label>
                              <Input
                                type="time"
                                value={notificationPrefs.quietHoursStart || '22:00'}
                                onChange={(e) =>
                                  setNotificationPrefs({ ...notificationPrefs, quietHoursStart: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">End Time</Label>
                              <Input
                                type="time"
                                value={notificationPrefs.quietHoursEnd || '07:00'}
                                onChange={(e) =>
                                  setNotificationPrefs({ ...notificationPrefs, quietHoursEnd: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Priority Filters */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Priority Filters</h3>
                      <p className="text-xs text-muted-foreground">Choose which priority levels trigger notifications</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                            <span className="text-sm">Urgent</span>
                          </div>
                          <Switch
                            checked={notificationPrefs.priorityUrgent ?? true}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs({ ...notificationPrefs, priorityUrgent: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" />
                            <span className="text-sm">High</span>
                          </div>
                          <Switch
                            checked={notificationPrefs.priorityHigh ?? true}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs({ ...notificationPrefs, priorityHigh: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge className="h-2 w-2 p-0 rounded-full bg-yellow-500" />
                            <span className="text-sm">Normal</span>
                          </div>
                          <Switch
                            checked={notificationPrefs.priorityNormal ?? true}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs({ ...notificationPrefs, priorityNormal: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge className="h-2 w-2 p-0 rounded-full bg-green-500" />
                            <span className="text-sm">Low</span>
                          </div>
                          <Switch
                            checked={notificationPrefs.priorityLow ?? true}
                            onCheckedChange={(checked) =>
                              setNotificationPrefs({ ...notificationPrefs, priorityLow: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Module Filters */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Module Filters</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Correspondence</Label>
                          <Switch
                              checked={notificationPrefs.moduleCorrespondence ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleCorrespondence: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Document Management</Label>
                            <Switch
                              checked={notificationPrefs.moduleDms ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleDms: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Workflow</Label>
                            <Switch
                              checked={notificationPrefs.moduleWorkflow ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleWorkflow: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">System</Label>
                            <Switch
                              checked={notificationPrefs.moduleSystem ?? true}
                              onCheckedChange={(checked) =>
                                setNotificationPrefs({ ...notificationPrefs, moduleSystem: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>

                    <Separator />

                    {/* Auto Archive */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Auto-Archive Notifications</h3>
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-normal">Archive read notifications after</Label>
                        <Select
                          value={String(notificationPrefs.autoArchiveDays ?? 30)}
                          onValueChange={(value) =>
                            setNotificationPrefs({ ...notificationPrefs, autoArchiveDays: parseInt(value) })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    </div>

                    <Separator />

                    <Button 
                      onClick={handleSaveNotifications} 
                      disabled={isSavingNotifications}
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
                <CardDescription>Customize the appearance of the application</CardDescription>
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
            {/* 2FA Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account by requiring a verification code from your phone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {twoFactorEnabled ? (
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {twoFactorEnabled ? '2FA is enabled' : '2FA is not enabled'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorEnabled
                          ? 'Your account is protected with two-factor authentication'
                          : 'Protect your account with authenticator app verification'}
                      </p>
                    </div>
                  </div>
                  {twoFactorEnabled ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowBackupCodes(true)}>
                        <Key className="h-4 w-4 mr-2" />
                        Backup Codes
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDisable2FA}>
                        Disable
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleSetup2FA}>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Enable 2FA
                    </Button>
                  )}
                </div>

                {twoFactorEnabled && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                    <p className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Check className="h-4 w-4" />
                      Two-factor authentication is active. You&apos;ll need your authenticator app to sign in.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Card */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Use a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                      }
                    }}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({ ...passwordErrors, newPassword: '' });
                      }
                    }}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                      }
                    }}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                <Button 
                  onClick={() => setShowPasswordDialog(true)}
                  disabled={isChangingPassword}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-4">
            {/* Signature Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Upload and manage your digital signature. A signature is required for all approvals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 border border-dashed rounded-lg bg-muted/30">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Supported formats: <strong>PNG, JPG, SVG</strong> • Max size: <strong>{MAX_SIGNATURE_SIZE_MB}MB</strong></p>
                    <p>For best results, use a transparent PNG with your signature on a white background.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label>Upload New Signature</Label>
                      <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleSignatureUpload}
                        disabled={isUploading}
                          className="flex-1"
                      />
                    </div>
                  </div>

                    {!signature && (
                      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No signature uploaded</p>
                        <p className="text-xs">Upload your signature to approve correspondence</p>
                      </div>
                    )}
                  </div>

                  {/* Preview Section */}
                  {signature && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Current Signature</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(signature.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setShowDeleteSignatureDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                      <div className="p-6 border rounded-lg bg-white flex items-center justify-center min-h-[120px]">
                        <img
                          src={signature.imageData}
                          alt="Digital signature preview"
                          className="max-h-24 object-contain"
                        />
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>File:</strong> {signature.fileName || 'Unknown'}
                        </p>
                    </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signature Templates Card */}
            <Card>
              <CardHeader>
                <CardTitle>Signature Templates</CardTitle>
                <CardDescription>
                  Configure how your signature appears in different workflow actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="space-y-4">
                    <TabsList>
                    <TabsTrigger value="personal">My Preferences</TabsTrigger>
                      <TabsTrigger value="organization">Organization Templates</TabsTrigger>
                    </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Override organization defaults with your personal preferences for each action type.
                        </p>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                          {templateTypes.map((type) => {
                        const templatesForType = signatureTemplates.filter(t => t.templateType === type);
                        const orgDefault = templatesForType.find(t => t.defaultApply) ?? templatesForType[0];
                            const selectedValue = signaturePreferences.templateOverrides?.[type] ?? '__organization__';
                        
                            return (
                              <Card key={type} className="border-muted">
                                <CardHeader className="pb-2">
                              <CardTitle className="text-sm capitalize flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {type}
                              </CardTitle>
                                </CardHeader>
                            <CardContent>
                                    <Select
                                      value={selectedValue}
                                      onValueChange={(value) => handleTemplateOverrideChange(type, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__organization__">
                                    Use organization default
                                    {orgDefault && <span className="text-xs text-muted-foreground ml-2">({orgDefault.name})</span>}
                                        </SelectItem>
                                        {templatesForType.map(template => (
                                          <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                            <Switch
                              checked={signaturePreferences.autoApplyForMinutes ?? false}
                              onCheckedChange={handleAutoApplyMinutesChange}
                            />
                        <span className="text-sm">Auto-apply signature to minutes</span>
                          </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleResetPersonalPreferences} disabled={!hasPreferenceChanges}>
                              Reset
                            </Button>
                        <Button size="sm" onClick={handleSavePersonalPreferences} disabled={!hasPreferenceChanges}>
                              Save Preferences
                            </Button>
                        </div>
                      </div>
                    </TabsContent>

                  <TabsContent value="organization" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Organization-wide templates used as defaults for all users.
                        </p>
                      <Button variant="outline" size="sm" onClick={resetOrganizationTemplates}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                          Reset to Default
                        </Button>
                      </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {signatureTemplates.map(template => {
                          const isEditing = editingTemplateId === template.id;
                          const draft = isEditing ? templateDraft : template;
                        
                          return (
                            <Card key={template.id} className="border-muted">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  {isEditing ? (
                                    <Input
                                      value={draft?.name ?? ''}
                                      onChange={(e) => updateTemplateDraft('name', e.target.value)}
                                    className="h-8 text-sm font-semibold"
                                    />
                                  ) : (
                                    <CardTitle className="text-sm">{template.name}</CardTitle>
                                  )}
                                <Badge variant="outline" className="text-xs capitalize">{template.templateType}</Badge>
                                </div>
                              </CardHeader>
                            <CardContent className="space-y-3">
                                  {isEditing ? (
                                    <Textarea
                                      value={draft?.format ?? ''}
                                      onChange={(e) => updateTemplateDraft('format', e.target.value)}
                                      className="text-xs font-mono"
                                      rows={4}
                                    />
                                  ) : (
                                <div className="p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap">
                                        {template.format}
                                    </div>
                                  )}
                              
                              <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={draft?.defaultApply ?? false}
                                        onCheckedChange={(checked) => updateTemplateDraft('defaultApply', checked)}
                                        disabled={!isEditing}
                                      />
                                  <span className="text-xs text-muted-foreground">Default</span>
                                </div>

                                  {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={cancelEditTemplate}>
                                      <X className="h-4 w-4" />
                                      </Button>
                                    <Button size="sm" onClick={saveTemplateChanges}>
                                      <Check className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                  <Button size="sm" variant="ghost" onClick={() => beginEditTemplate(template)}>
                                    <Pencil className="h-4 w-4" />
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Dialogs */}
        
        {/* Password Change Dialog */}
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
              <AlertDialogAction onClick={handleChangePassword} disabled={isChangingPassword}>
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

        {/* Signature Delete Dialog */}
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
              <AlertDialogAction onClick={handleSignatureDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Signature
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2FA Setup Dialog */}
        <Dialog open={showSetup2FA} onOpenChange={setShowSetup2FA}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <div className="w-48 h-48 bg-muted flex items-center justify-center rounded">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Can&apos;t scan? Enter this code manually:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">{twoFactorSecret}</code>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(twoFactorSecret);
                    toast.success('Code copied');
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enter verification code from your app:</Label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSetup2FA(false)}>Cancel</Button>
              <Button onClick={handleVerify2FA} disabled={verificationCode.length !== 6 || isEnabling2FA}>
                {isEnabling2FA ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Codes Dialog */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Backup Codes
              </DialogTitle>
              <DialogDescription>
                Save these backup codes in a secure location. Each code can only be used once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Keep these codes safe. If you lose access to your authenticator app, you can use these codes to sign in.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyBackupCodes}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  const content = backupCodes.join('\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'npa-ecm-backup-codes.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <Button variant="outline" className="w-full" onClick={handleRegenerateBackupCodes}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Generate New Codes
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowBackupCodes(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
