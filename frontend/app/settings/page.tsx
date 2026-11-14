"use client";

import { logError } from '@/lib/client-logger';
import { ALLOWED_IMAGE_MIME_TYPES } from '@/lib/file-types';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { appType } from '@/lib/app-type';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';

import dynamic from 'next/dynamic';

const PasswordDialog = dynamic(() => import('@/components/settings/PasswordDialog').then(mod => ({ default: mod.PasswordDialog })), { ssr: false });
const ProfileSection = dynamic(() => import('@/components/settings/ProfileSection').then(mod => ({ default: mod.ProfileSection })), { ssr: false });
const NotificationsSection = dynamic(() => import('@/components/settings/NotificationsSection').then(mod => ({ default: mod.NotificationsSection })), { ssr: false });
const AppearanceSection = dynamic(() => import('@/components/settings/AppearanceSection').then(mod => ({ default: mod.AppearanceSection })), { ssr: false });
const SecuritySection = dynamic(() => import('@/components/settings/SecuritySection').then(mod => ({ default: mod.SecuritySection })), { ssr: false });
import { User, Bell, Shield, Palette, Image as ImageIcon } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { SignatureSettingsCard } from '@/components/settings/SignatureSettingsCard';
import { StepUpDialog } from '@/components/settings/StepUpDialog';
import {
  getNotificationPreferences,
  type NotificationPreferences as NotificationPreferencesType,
} from '@/lib/api/notifications';
import {
  MAX_PHOTO_SIZE_MB,
  validateEmail,
  validatePhone,
  convertBackendToFrontend,
  convertFrontendToBackend,
} from './settings-utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, refresh: refreshUser } = useCurrentUser();
  
  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // 2FA state
  const [seal2FARequired, setSeal2FARequired] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [sealSignatureActive, setSealSignatureActive] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showSetup2FAStepUp, setShowSetup2FAStepUp] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email_otp'>('totp');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailOtpId, setEmailOtpId] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferencesType | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'signature' | 'delegation'>('profile');
  const [signatureHasUnsavedChanges, setSignatureHasUnsavedChanges] = useState(false);

  // Initialize profile from currentUser (already fetched by useCurrentUser)
  useEffect(() => {
    if (currentUser) {
      setProfile({
        firstName: currentUser.firstName || '',
        middleName: currentUser.middleName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
      });
      setProfilePhoto(currentUser.profilePhoto || null);
    }
  }, [currentUser]);

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {

      
      setIsLoadingNotifications(true);
      try {
        const prefs = await getNotificationPreferences();
        if (prefs) {
          const converted = convertBackendToFrontend(prefs as unknown as Record<string, unknown>);
          if (converted) {
            setNotificationPrefs(converted);
          }
        }
      } catch (error: unknown) {
        logError('Failed to load notification preferences', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoadingNotifications(false);
      }
    };
    
    void loadNotificationPreferences();
    // only runs once on mount
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'notifications' || hash === 'appearance' || hash === 'security' || hash === 'signature' || hash === 'profile') {
      setActiveTab(hash as typeof activeTab);
    }
  }, [setActiveTab]);

  const handleProfileChange = useCallback((field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setProfileErrors(prev => {
      if (prev[field]) return { ...prev, [field]: '' };
      return prev;
    });
  }, []);

  // Profile photo upload
  const handleNotificationRetry = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const prefs = await getNotificationPreferences();
      if (prefs) setNotificationPrefs(convertBackendToFrontend(prefs as unknown as Record<string, unknown>));
    } catch (error: unknown) {
      logError('Failed to reload preferences', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  const handleNotificationPrefChange = useCallback((field: string, value: boolean | string | number) => {
    if (notificationPrefs) {
      setNotificationPrefs({ ...notificationPrefs, [field]: value });
    }
  }, [notificationPrefs]);

  const handleSetup2FADialogChange = useCallback((open: boolean) => {
    setShowSetup2FA(open);
    if (!open) {
      setVerificationCode('');
      setOtpSent(false);
      setEmailOtpId(null);
    }
  }, []);
  const handleBackupCodesDialogChange = useCallback((open: boolean) => {
    setShowBackupCodes(open);
    if (!open) setBackupCodes([]);
  }, []);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, or WebP)');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo must be ${MAX_PHOTO_SIZE_MB}MB or less`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append('profile_photo', file);
      const updated = await apiFetch<Record<string, unknown>>('/accounts/auth/me/photo/', {
        method: 'POST',
        body: formData,
      });
      setProfilePhoto(typeof updated.profile_photo === 'string' ? updated.profile_photo : null);
      await refreshUser();
      toast.success('Profile photo updated');
    } catch (error: unknown) {
      logError('Failed to upload photo', error);
      toast.error('Could not update your profile photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
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
      const updated = await apiFetch<Record<string, unknown>>('/accounts/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: profile.firstName,
          middle_name: profile.middleName,
          last_name: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          bio: profile.bio,
        }),
      });
      setProfile({
        firstName: typeof updated.first_name === 'string' ? updated.first_name : profile.firstName,
        middleName: typeof updated.middle_name === 'string' ? updated.middle_name : profile.middleName,
        lastName: typeof updated.last_name === 'string' ? updated.last_name : profile.lastName,
        email: typeof updated.email === 'string' ? updated.email : profile.email,
        phone: typeof updated.phone === 'string' ? updated.phone : profile.phone,
        bio: typeof updated.bio === 'string' ? updated.bio : profile.bio,
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
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
      const converted = convertBackendToFrontend(response as Record<string, unknown>);
      if (converted) {
        setNotificationPrefs(converted);
      }
      toast.success('Notification preferences saved');
    } catch (error: unknown) {
      logError('Failed to save notification preferences', error);
      toast.error('Failed to save notification preferences. Please try again.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const loadBackupCodeStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ remaining: number }>('/accounts/2fa/backup-codes/status/');
      setBackupCodesRemaining(data.remaining ?? 0);
    } catch (error: unknown) {
      logError('Failed to load backup code status', error);
    }
  }, []);

  const load2FAStatus = useCallback(async () => {
    if (!currentUser) {
      setIsLoading2FAStatus(false);
      return;
    }

    try {
      const status = await apiFetch<{
        require_2fa: boolean;
        has_signature: boolean;
        is_signature_active: boolean;
        totp_enabled: boolean;
        totp_confirmed: boolean;
        email_otp_enabled: boolean;
        preferred_method: 'email' | 'totp';
        email: string;
        has_email: boolean;
        available_methods: string[];
      }>('/accounts/2fa/status/');

      const emailAvailable = Boolean(status.has_email && status.email_otp_enabled);
      setSeal2FARequired(status.require_2fa);
      setHasSignature(status.has_signature);
      setSealSignatureActive(status.is_signature_active);
      setOtpEnabled(emailAvailable);
      setTotpEnabled(status.totp_enabled && status.totp_confirmed);
    } catch (error: unknown) {
      logError('Failed to load 2FA status', error);
    } finally {
      setIsLoading2FAStatus(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void load2FAStatus();
    void loadBackupCodeStatus();
  }, [load2FAStatus, loadBackupCodeStatus]);

  // OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // 2FA handlers
  const handleSetup2FA = async (method: 'totp' | 'email_otp', password?: string) => {
    setTwoFactorMethod(method);
    setVerificationCode('');
    setOtpSent(false);
    setEmailOtpId(null);
    
    if (method === 'totp') {
      try {
        setIsEnabling2FA(true);
        const response = await apiFetch<{
          secret: string;
          provisioning_uri: string;
          qr_code: string;
        }>('/accounts/2fa/totp/setup/', {
          method: 'POST',
          body: JSON.stringify(password ? { current_password: password } : {}),
        });
        
        setTwoFactorSecret(response.secret);
        setTwoFactorQRCode(response.qr_code);
        setShowSetup2FA(true);
      } catch (error: unknown) {
        logError('Failed to setup TOTP', error);
        const message = error instanceof Error ? error.message : '';
        if (!password && /re-auth/i.test(message)) {
          setShowSetup2FAStepUp(true);
        } else {
          toast.error(error instanceof Error ? error.message : 'Failed to setup authenticator app. Please try again.');
          if (password) throw error;
        }
      } finally {
        setIsEnabling2FA(false);
      }
    } else {
      // Email OTP - just show the dialog
      setShowSetup2FA(true);
    }
  };

  const handleSendEmailOTP = async () => {
    try {
      setIsEnabling2FA(true);
      const response = await apiFetch<{ otp_id: string }>('/accounts/2fa/email/request/', {
        method: 'POST',
        body: JSON.stringify({ purpose: 'email_otp_setup' }),
      });
      setEmailOtpId(response.otp_id);
      setOtpSent(true);
      setOtpCountdown(60); // 60 second countdown
      toast.success('OTP sent to your email');
    } catch (error: unknown) {
      logError('Failed to send OTP', error);
      toast.error((error instanceof Error ? error.message : 'Failed to send OTP. Please try again.'));
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsEnabling2FA(true);
    try {
      const endpoint = twoFactorMethod === 'totp' 
        ? '/accounts/2fa/totp/verify/' 
        : '/accounts/2fa/email/verify/';
      
      const response = await apiFetch<{
        verified: boolean;
        verification_token?: string;
        backup_codes?: string[];
        message?: string;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(
          twoFactorMethod === 'totp'
            ? { code: verificationCode, purpose: 'setup', generate_backup_codes: true }
            : {
                otp_id: emailOtpId,
                code: verificationCode,
                purpose: 'email_otp_setup',
              },
        ),
      });
      
      if (response.verified) {
        setBackupCodes(response.backup_codes ?? []);
        setShowSetup2FA(false);
        setShowBackupCodes(true);
        setVerificationCode('');
        setOtpSent(false);
        setEmailOtpId(null);
        await load2FAStatus();
        await loadBackupCodeStatus();
        toast.success('Two-factor authentication enabled');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } catch (error: unknown) {
      logError('Failed to enable 2FA', error);
      toast.error((error instanceof Error ? error.message : 'Invalid code. Please try again.'));
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async (
    method: 'totp' | 'email_otp',
    credential: { code?: string; password?: string },
  ) => {
    try {
      if (method === 'totp') {
        await apiFetch('/accounts/2fa/totp/disable/', {
          method: 'POST',
          body: JSON.stringify({
            code: credential.code,
            current_password: credential.password,
          }),
        });
        setTwoFactorSecret('');
        setTwoFactorQRCode('');
        toast.success('Authenticator app disabled');
      } else {
        await apiFetch('/accounts/2fa/email/disable/', {
          method: 'POST',
          body: JSON.stringify({ current_password: credential.password }),
        });
        toast.success('Email OTP disabled');
      }
      await load2FAStatus();
    } catch (error: unknown) {
      logError('Failed to disable 2FA', error);
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA');
      throw error;
    }
  };

  const handleRegenerateBackupCodes = async (password: string) => {
    try {
      const response = await apiFetch<{ backup_codes: string[]; remaining: number }>(
        '/accounts/2fa/backup-codes/generate/',
        {
          method: 'POST',
          body: JSON.stringify({ current_password: password }),
        },
      );
      setBackupCodes(response.backup_codes);
      setBackupCodesRemaining(response.remaining);
      toast.success('New backup codes generated');
    } catch (error: unknown) {
      logError('Failed to generate backup codes', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate backup codes');
      throw error;
    }
  };

  const handleOpenBackupCodes = async () => {
    await loadBackupCodeStatus();
    setShowBackupCodes(true);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  const userInitials = currentUser
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U';

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className={appType.pageTitleList}>Settings</h1>
          <p className={cn(appType.pageSubtitle)}>
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(tab: string) => {
          const newTab = tab as typeof activeTab;
          if (
            activeTab === 'signature' &&
            newTab !== 'signature' &&
            signatureHasUnsavedChanges &&
            !window.confirm('You have unsaved seal settings. Leave without saving?')
          ) {
            return;
          }
          setActiveTab(newTab);
          setSignatureHasUnsavedChanges(false);
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
            {/* =============================================================================
            // DELEGATION TAB - COMMENTED OUT FOR FUTURE USE
            // Uncomment to enable office delegation settings
            // Requires backend changes: uncomment delegation fields in Office model and run migrations
            // =============================================================================
            <TabsTrigger value="delegation">
              <Users className="h-4 w-4 mr-2" />
              Delegation
            </TabsTrigger>
            */}
          </TabsList>

          <ProfileSection
            profile={profile}
            profilePhoto={profilePhoto}
            profileErrors={profileErrors}
            isSavingProfile={isSavingProfile}
            isUploadingPhoto={isUploadingPhoto}
            userInitials={userInitials}
            systemRole={currentUser?.systemRole}
            designation={currentUser?.designation}
            gradeLevel={currentUser?.gradeLevel}
            personnelNumber={currentUser?.personnelNumber}
            employeeId={currentUser?.employeeId}
            division={currentUser?.divisionName}
            department={currentUser?.departmentName}
            onPhotoUpload={handlePhotoUpload}
            onSave={handleSaveProfile}
            onProfileChange={handleProfileChange}
          />

          <NotificationsSection
            notificationPrefs={notificationPrefs}
            isLoadingNotifications={isLoadingNotifications}
            isSavingNotifications={isSavingNotifications}
            onSave={handleSaveNotifications}
            onRetry={handleNotificationRetry}
            onPrefChange={handleNotificationPrefChange}
          />

          <AppearanceSection theme={theme} onThemeChange={setTheme} />

          <SecuritySection
            seal2FARequired={seal2FARequired}
            hasSignature={hasSignature}
            sealSignatureActive={sealSignatureActive}
            totpEnabled={totpEnabled}
            otpEnabled={otpEnabled}
            showSetup2FA={showSetup2FA}
            twoFactorMethod={twoFactorMethod}
            twoFactorSecret={twoFactorSecret}
            twoFactorQRCode={twoFactorQRCode}
            verificationCode={verificationCode}
            backupCodes={backupCodes}
            backupCodesRemaining={backupCodesRemaining}
            showBackupCodes={showBackupCodes}
            isEnabling2FA={isEnabling2FA}
            isLoading2FAStatus={isLoading2FAStatus}
            otpSent={otpSent}
            otpCountdown={otpCountdown}
            email={profile.email}
            onSetup2FA={handleSetup2FA}
            onSendEmailOTP={handleSendEmailOTP}
            onVerify2FA={handleVerify2FA}
            onDisable2FA={handleDisable2FA}
            onRegenerateBackupCodes={handleRegenerateBackupCodes}
            onOpenBackupCodes={handleOpenBackupCodes}
            onCopyBackupCodes={copyBackupCodes}
            onVerificationCodeChange={setVerificationCode}
            onPasswordDialogChange={setShowPasswordDialog}
            onSetup2FADialogChange={handleSetup2FADialogChange}
            onBackupCodesDialogChange={handleBackupCodesDialogChange}
          />

          {/* Signature Tab - Now using the new SignatureSettingsCard with live seal preview */}
          <TabsContent value="signature" className="space-y-4">
            <SignatureSettingsCard onUnsavedChange={setSignatureHasUnsavedChanges} />
          </TabsContent>

        </Tabs>
        
        {/* Dialogs */}
        
        <PasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />

        <StepUpDialog
          open={showSetup2FAStepUp}
          onOpenChange={setShowSetup2FAStepUp}
          title="Confirm authenticator setup"
          description="An authenticator is already configured. Confirm your password to continue setup."
          mode="password"
          confirmLabel="Continue setup"
          onConfirm={async (password) => {
            await handleSetup2FA('totp', password);
          }}
        />

      </div>
    </>
  );
}
