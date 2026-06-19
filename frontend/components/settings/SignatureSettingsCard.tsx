"use client";
import Image from 'next/image';
import { DEFAULT_SEAL_OFFICE_NAME } from '@/lib/branding';

import { ALLOWED_SIGNATURE_MIME_TYPES, ACCEPT_IMAGE_SIGNATURE } from '@/lib/file-types';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  AlertCircle, 
  ImageIcon, 
  Trash2, 
  Shield, 
  Eye, 
  Upload, 
  Settings2, 
  Download,
  Printer,
  RotateCcw,
  FileDown,
  FileUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Lock,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DigitalSealPreview, type DigitalSealPreviewHandle } from '@/components/seals/DigitalSealPreview';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  fetchUserSignature,
  uploadUserSignature,
  deleteUserSignatureFromBackend,
  updateSignatureSettings,
  type StoredSignature,
} from '@/lib/signature-storage';
import { buildDownloadUrl } from '@/lib/correspondence-url-utils';
import { logError } from '@/lib/client-logger';

const MAX_SIGNATURE_SIZE_MB = 2;
const MAX_OFFICE_NAME_LENGTH = 100;
const MAX_OFFICE_TITLE_LENGTH = 100;
const MAX_PREFIX_LENGTH = 10;

// Default seal settings
const DEFAULT_SEAL_SETTINGS = {
  sealOfficeName: DEFAULT_SEAL_OFFICE_NAME,
  sealOfficeTitle: '',
  sealPrefix: 'NPA',
  require2fa: true,
};

export const SignatureSettingsCard = () => {
  const { currentUser } = useCurrentUser();
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [previewSize, setPreviewSize] = useState<250 | 300 | 400>(300);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const sealPreviewRef = useRef<DigitalSealPreviewHandle>(null);
  
  // Seal settings with validation
  const [sealOfficeName, setSealOfficeName] = useState(DEFAULT_SEAL_OFFICE_NAME);
  const [sealOfficeTitle, setSealOfficeTitle] = useState('');
  const [sealPrefix, setSealPrefix] = useState('NPA');
  const [require2fa, setRequire2fa] = useState(true);
  
  // Validation states
  const [errors, setErrors] = useState<{
    officeName?: string;
    officeTitle?: string;
    prefix?: string;
    file?: string;
  }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load signature from backend
  useEffect(() => {
    const loadSignature = async () => {
      if (!currentUser?.id) return;
      
      setIsLoading(true);
      try {
        const sig = await fetchUserSignature();
        if (sig) {
          setSignature(sig);
          setSealOfficeName(sig.sealOfficeName || DEFAULT_SEAL_SETTINGS.sealOfficeName);
          setSealOfficeTitle(sig.sealOfficeTitle || DEFAULT_SEAL_SETTINGS.sealOfficeTitle);
          setSealPrefix(sig.sealPrefix || DEFAULT_SEAL_SETTINGS.sealPrefix);
          setRequire2fa(sig.require2fa ?? DEFAULT_SEAL_SETTINGS.require2fa);
        }
      } catch (error: unknown) {
        logError('Failed to load signature', error);
        toast.error('Failed to load signature settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSignature();
  }, [currentUser?.id]);

  // Auto-generate seal office title based on user role
  useEffect(() => {
    if (!sealOfficeTitle && currentUser?.systemRole) {
      setSealOfficeTitle(`OFFICE OF THE ${currentUser.systemRole.toUpperCase()}`);
    }
  }, [currentUser?.systemRole, sealOfficeTitle]);

  // Track unsaved changes
  useEffect(() => {
    if (!signature) return;
    
    const hasChanges = 
      sealOfficeName !== (signature.sealOfficeName || DEFAULT_SEAL_SETTINGS.sealOfficeName) ||
      sealOfficeTitle !== (signature.sealOfficeTitle || DEFAULT_SEAL_SETTINGS.sealOfficeTitle) ||
      sealPrefix !== (signature.sealPrefix || DEFAULT_SEAL_SETTINGS.sealPrefix) ||
      require2fa !== (signature.require2fa ?? DEFAULT_SEAL_SETTINGS.require2fa);
    
    setHasUnsavedChanges(hasChanges);
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  // Validation functions
  const validateOfficeName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Organization name is required';
    }
    if (value.length > MAX_OFFICE_NAME_LENGTH) {
      return `Maximum ${MAX_OFFICE_NAME_LENGTH} characters allowed`;
    }
    return undefined;
  };

  const validateOfficeTitle = (value: string): string | undefined => {
    if (value.length > MAX_OFFICE_TITLE_LENGTH) {
      return `Maximum ${MAX_OFFICE_TITLE_LENGTH} characters allowed`;
    }
    return undefined;
  };

  const validatePrefix = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Serial prefix is required';
    }
    if (value.length > MAX_PREFIX_LENGTH) {
      return `Maximum ${MAX_PREFIX_LENGTH} characters allowed`;
    }
    if (!/^[A-Z0-9-]+$/.test(value)) {
      return 'Only uppercase letters, numbers, and hyphens allowed';
    }
    return undefined;
  };

  const handleOfficeNameChange = (value: string) => {
    setSealOfficeName(value);
    const error = validateOfficeName(value);
    setErrors(prev => ({ ...prev, officeName: error }));
  };

  const handleOfficeTitleChange = (value: string) => {
    setSealOfficeTitle(value);
    const error = validateOfficeTitle(value);
    setErrors(prev => ({ ...prev, officeTitle: error }));
  };

  const handlePrefixChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setSealPrefix(upperValue);
    const error = validatePrefix(upperValue);
    setErrors(prev => ({ ...prev, prefix: error }));
  };

  const handleSignatureUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setErrors(prev => ({ ...prev, file: undefined }));

    // Validate file size
    if (file.size > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
      const error = `File size must be ${MAX_SIGNATURE_SIZE_MB}MB or less. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
      setErrors(prev => ({ ...prev, file: error }));
      toast.error(error);
      return;
    }

    // Validate file type
    if (!ALLOWED_SIGNATURE_MIME_TYPES.includes(file.type)) {
      const error = `Invalid file type. Please upload a PNG, JPG, or SVG file. Current type: ${file.type}`;
      setErrors(prev => ({ ...prev, file: error }));
      toast.error(error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const uploaded = await uploadUserSignature(file, {
        sealOfficeName,
        sealOfficeTitle,
        sealPrefix,
        require2fa,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (uploaded) {
        setSignature(uploaded);
        toast.success('Signature uploaded successfully', {
          description: 'Your signature is now ready to use for document approvals.',
          duration: 3000,
        });
        setActiveTab('preview'); // Switch to preview tab
        setTimeout(() => setUploadProgress(0), 1000);
      }
    } catch (error: unknown) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      logError('Failed to upload signature', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to upload signature. Please try again.';
      const status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { status?: unknown } }).response !== null &&
        typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      const detail =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { data?: unknown } }).response !== null &&
        typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data === 'object' &&
        (error as { response?: { data?: { detail?: unknown } } }).response?.data !== null &&
        typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;

      if (status === 413) {
        errorMessage = 'File is too large. Please use a smaller image file.';
      } else if (status === 400) {
        errorMessage = detail || 'Invalid file format. Please check your file and try again.';
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ ...prev, file: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  const handleDeleteSignature = useCallback(async () => {
    try {
      await deleteUserSignatureFromBackend();
      setSignature(null);
      setShowDeleteDialog(false);
      toast.success('Signature deleted successfully', {
        description: 'You can upload a new signature anytime.',
      });
    } catch (error: unknown) {
      logError('Failed to delete signature', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete signature. Please try again.';
      toast.error(errorMessage);
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!signature) return;
    
    // Validate all fields
    const officeNameError = validateOfficeName(sealOfficeName);
    const officeTitleError = validateOfficeTitle(sealOfficeTitle);
    const prefixError = validatePrefix(sealPrefix);
    
    if (officeNameError || officeTitleError || prefixError) {
      setErrors({
        officeName: officeNameError,
        officeTitle: officeTitleError,
        prefix: prefixError,
      });
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    setIsSaving(true);
    try {
      const updated = await updateSignatureSettings({
        sealOfficeName,
        sealOfficeTitle,
        sealPrefix,
        require2fa,
      });
      
      if (updated) {
        setSignature(updated);
        setHasUnsavedChanges(false);
        toast.success('Seal settings saved successfully', {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      }
    } catch (error: unknown) {
      logError('Failed to save settings', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  const handleResetToDefaults = useCallback(() => {
    setSealOfficeName(DEFAULT_SEAL_SETTINGS.sealOfficeName);
    setSealOfficeTitle(currentUser?.systemRole 
      ? `OFFICE OF THE ${currentUser.systemRole.toUpperCase()}`
      : DEFAULT_SEAL_SETTINGS.sealOfficeTitle);
    setSealPrefix(DEFAULT_SEAL_SETTINGS.sealPrefix);
    setRequire2fa(DEFAULT_SEAL_SETTINGS.require2fa);
    setErrors({});
    toast.success('Settings reset to defaults');
  }, [currentUser?.systemRole]);

  const handleExportSettings = useCallback(() => {
    if (!signature) return;
    
    const settings = {
      sealOfficeName,
      sealOfficeTitle,
      sealPrefix,
      require2fa,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seal-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Settings exported successfully');
    setShowExportDialog(false);
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  const handleImportSettings = useCallback((event: Event) => {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        if (settings.sealOfficeName) setSealOfficeName(settings.sealOfficeName);
        if (settings.sealOfficeTitle) setSealOfficeTitle(settings.sealOfficeTitle);
        if (settings.sealPrefix) setSealPrefix(settings.sealPrefix);
        if (settings.require2fa !== undefined) setRequire2fa(settings.require2fa);
        
        toast.success('Settings imported successfully');
        setShowExportDialog(false);
      } catch (error: unknown) {
        logError('Failed to import settings', error);
        toast.error('Invalid settings file. Please check the format and try again.');
      }
    };
    reader.readAsText(file);
    if (input) input.value = '';
  }, []);

  const handleDownloadSeal = useCallback(() => {
    if (sealPreviewRef.current) {
      sealPreviewRef.current.download();
      toast.success('Seal downloaded successfully');
    } else {
      // Fallback: find canvas in DOM
      const sealCanvas = document.querySelector('canvas[class*="rounded-full"]') as HTMLCanvasElement;
      if (!sealCanvas) {
        toast.error('Seal preview not available');
        return;
      }
      
      const url = sealCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `seal-${sealPrefix}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Seal downloaded successfully');
    }
  }, [sealPrefix]);

  const handlePrintSeal = useCallback(() => {
    const sealCanvas = document.querySelector('canvas[class*="rounded-full"]') as HTMLCanvasElement;
    if (!sealCanvas) {
      toast.error('Seal preview not available');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the seal');
      return;
    }
    
    const imgData = sealCanvas.toDataURL('image/png');
    printWindow.document.write(`
      <html>
        <head>
          <title>Seal Print</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="Digital Seal" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Loading signature settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        {/* Main Signature Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Digital Signature & Executive Seal
            </CardTitle>
            <CardDescription>
              Upload your signature for document approvals. Your signature will be embedded in official seals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'preview')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Signature
                </TabsTrigger>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value="preview" 
                      className="flex items-center gap-2" 
                      disabled={!signature}
                    >
                      <Eye className="h-4 w-4" />
                      Seal Preview
                    </TabsTrigger>
                  </TooltipTrigger>
                  {!signature && (
                    <TooltipContent>
                      <p>Upload a signature first to preview the seal</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TabsList>

              <TabsContent value="upload" className="space-y-6 mt-6">
                {/* Upload Instructions */}
                <div className="flex items-start gap-4 p-4 border border-dashed rounded-lg bg-muted/30">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Supported formats: <strong>PNG, JPG, SVG</strong> • Max size: <strong>{MAX_SIGNATURE_SIZE_MB}MB</strong></p>
                    <p>For best results, use a <strong>transparent PNG</strong> with your signature on a white background.</p>
                    <p className="text-xs">Your signature is stored securely and encrypted at rest.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Upload Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Upload Signature</Label>
                    <Input
                      type="file"
                      accept={ACCEPT_IMAGE_SIGNATURE}
                      onChange={handleSignatureUpload}
                      disabled={isUploading}
                      aria-label="Upload signature file"
                    />
                    
                    {errors.file && (
                      <div className="flex items-start gap-2 text-sm text-destructive">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{errors.file}</span>
                      </div>
                    )}
                    
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading signature...</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Current Signature Preview */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Current Signature</Label>
                    {signature ? (
                      <div className="space-y-3">
                        <div className="p-4 border rounded-lg bg-white dark:bg-background flex items-center justify-center min-h-[100px]">
                          <Image
                            src={
                              signature.imageData.startsWith('data:')
                                ? signature.imageData
                                : (buildDownloadUrl(signature.imageData) ?? signature.imageData)
                            }
                            alt="Your signature"
                            width={300}
                            height={80}
                            className="max-h-20 object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Uploaded: {new Date(signature.uploadedAt).toLocaleDateString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            aria-label="Delete signature"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No signature uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-6 mt-6">
                {signature && (
                  <div className="space-y-6">
                    {/* Preview Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Preview Size:</Label>
                        <div className="flex gap-2">
                          {[250, 300, 400].map((size) => (
                            <Button
                              key={size}
                              variant={previewSize === size ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPreviewSize(size as 250 | 300 | 400)}
                            >
                              {size}px
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownloadSeal}
                              aria-label="Download seal as image"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download seal as PNG image</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrintSeal}
                              aria-label="Print seal"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Print seal preview</TooltipContent>
                        </Tooltip>
                        <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" aria-label="View full preview">
                              <Maximize2 className="h-4 w-4 mr-2" />
                              Fullscreen
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
                            <DialogHeader>
                              <DialogTitle>Full Seal Preview</DialogTitle>
                              <DialogDescription>
                                This is how your seal will appear on approved documents
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl">
                              <DigitalSealPreview
                                officeName={sealOfficeName}
                                officeTitle={sealOfficeTitle || `OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`}
                                serialPrefix={sealPrefix}
                                signatureImage={signature?.imageData?.startsWith('data:') ? signature.imageData : (buildDownloadUrl(signature?.imageData) ?? signature?.imageData)}
                                size={500}
                                showQR={true}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Seal Preview */}
                      <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border">
                        <p className="text-sm font-medium text-muted-foreground mb-4">
                          Live Seal Preview
                        </p>
                        <DigitalSealPreview
                          ref={sealPreviewRef}
                          officeName={sealOfficeName}
                          officeTitle={sealOfficeTitle || `OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`}
                          serialPrefix={sealPrefix}
                          signatureImage={signature?.imageData?.startsWith('data:') ? signature.imageData : (buildDownloadUrl(signature?.imageData) ?? signature?.imageData)}
                          size={previewSize}
                          showQR={true}
                        />
                        <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                          This is how your seal will appear on approved documents
                        </p>
                      </div>

                      {/* Seal Settings */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-medium">Seal Settings</h3>
                          </div>
                          {hasUnsavedChanges && (
                            <Badge variant="outline" className="text-xs">
                              Unsaved changes
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sealOfficeName">
                                Organization Name <span className="text-destructive">*</span>
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {sealOfficeName.length}/{MAX_OFFICE_NAME_LENGTH}
                              </span>
                            </div>
                            <Input
                              id="sealOfficeName"
                              value={sealOfficeName}
                              onChange={(e) => handleOfficeNameChange(e.target.value)}
                              placeholder={DEFAULT_SEAL_OFFICE_NAME}
                              maxLength={MAX_OFFICE_NAME_LENGTH}
                              aria-invalid={!!errors.officeName}
                              aria-describedby={errors.officeName ? "officeName-error" : undefined}
                            />
                            {errors.officeName && (
                              <p id="officeName-error" className="text-xs text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {errors.officeName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Text displayed at the top of the seal
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sealOfficeTitle">Office Title</Label>
                              <span className="text-xs text-muted-foreground">
                                {sealOfficeTitle.length}/{MAX_OFFICE_TITLE_LENGTH}
                              </span>
                            </div>
                            <Input
                              id="sealOfficeTitle"
                              value={sealOfficeTitle}
                              onChange={(e) => handleOfficeTitleChange(e.target.value)}
                              placeholder={`OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`}
                              maxLength={MAX_OFFICE_TITLE_LENGTH}
                              aria-invalid={!!errors.officeTitle}
                              aria-describedby={errors.officeTitle ? "officeTitle-error" : undefined}
                            />
                            {errors.officeTitle && (
                              <p id="officeTitle-error" className="text-xs text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {errors.officeTitle}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Text displayed at the bottom of the seal
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sealPrefix">
                                Serial Number Prefix <span className="text-destructive">*</span>
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {sealPrefix.length}/{MAX_PREFIX_LENGTH}
                              </span>
                            </div>
                            <Input
                              id="sealPrefix"
                              value={sealPrefix}
                              onChange={(e) => handlePrefixChange(e.target.value)}
                              placeholder="NPA"
                              maxLength={MAX_PREFIX_LENGTH}
                              className="uppercase"
                              aria-invalid={!!errors.prefix}
                              aria-describedby={errors.prefix ? "prefix-error" : undefined}
                            />
                            {errors.prefix && (
                              <p id="prefix-error" className="text-xs text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {errors.prefix}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Prefix for seal serial numbers (e.g., NPA-MD-XXXXXXXX)
                            </p>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="require2fa" className="flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Require 2FA for Seal
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Require two-factor authentication before applying seal
                              </p>
                            </div>
                            <Switch
                              id="require2fa"
                              checked={require2fa}
                              onCheckedChange={(checked) => {
                                setRequire2fa(checked);
                                if (checked) setShow2FADialog(true);
                              }}
                              aria-label="Require 2FA for seal"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={handleSaveSettings} 
                              className="flex-1"
                              disabled={isSaving || !hasUnsavedChanges}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Save Seal Settings
                                </>
                              )}
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  onClick={handleResetToDefaults}
                                  aria-label="Reset to default settings"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reset to default settings</TooltipContent>
                            </Tooltip>
                          </div>

                          <Separator />

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setShowExportDialog(true)}
                            >
                              <FileDown className="h-4 w-4 mr-2" />
                              Export Settings
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.json';
                                input.onchange = handleImportSettings;
                                input.click();
                              }}
                            >
                              <FileUp className="h-4 w-4 mr-2" />
                              Import Settings
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Usage Stats Card */}
        {signature && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Signature Usage</span>
                <Badge variant={signature.isActive ? 'default' : 'secondary'}>
                  {signature.isActive ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg border">
                  <p className="text-3xl font-bold text-primary">{signature.timesUsed || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Documents Sealed</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-semibold">
                    {signature.lastUsedAt 
                      ? new Date(signature.lastUsedAt).toLocaleDateString() 
                      : 'Never'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Last Used</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-semibold flex items-center justify-center gap-1">
                    {signature.require2fa ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        Disabled
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">2FA Required</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-semibold">
                    {signature.uploadedAt 
                      ? new Date(signature.uploadedAt).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Signature</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your digital signature? You will need to upload a new signature to approve documents with official seals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSignature}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Signature
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2FA Setup Dialog */}
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                2FA Required for Seal
              </DialogTitle>
              <DialogDescription>
                You've enabled 2FA requirement for seal application, but you don't have 2FA configured yet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">To use 2FA-protected seals:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to Settings → Security</li>
                    <li>Enable Two-Factor Authentication</li>
                    <li>Set up an authenticator app</li>
                    <li>Return here to use 2FA-protected seals</li>
                  </ol>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRequire2fa(false);
                    setShow2FADialog(false);
                  }}
                  className="flex-1"
                >
                  Disable 2FA Requirement
                </Button>
                <Button
                  onClick={() => {
                    setShow2FADialog(false);
                    // Navigate to security settings (you can implement navigation)
                    toast.info('Please configure 2FA in Security settings');
                  }}
                  className="flex-1"
                >
                  Go to Security Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Settings Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Seal Settings</DialogTitle>
              <DialogDescription>
                Export your seal configuration to a JSON file for backup or transfer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Settings to export:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Organization Name: {sealOfficeName}</li>
                  <li>Office Title: {sealOfficeTitle || 'Not set'}</li>
                  <li>Serial Prefix: {sealPrefix}</li>
                  <li>2FA Required: {require2fa ? 'Yes' : 'No'}</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExportSettings}
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default SignatureSettingsCard;
