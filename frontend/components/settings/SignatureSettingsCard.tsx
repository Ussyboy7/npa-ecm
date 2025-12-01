"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AlertCircle, ImageIcon, Trash2, Shield, Eye, Upload, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DigitalSealPreview } from '@/components/seals/DigitalSealPreview';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  fetchUserSignature,
  uploadUserSignature,
  deleteUserSignatureFromBackend,
  updateSignatureSettings,
  type StoredSignature,
} from '@/lib/signature-storage';
import { logError } from '@/lib/client-logger';

const MAX_SIGNATURE_SIZE_MB = 2;

export const SignatureSettingsCard = () => {
  const { currentUser } = useCurrentUser();
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  
  // Seal settings
  const [sealOfficeName, setSealOfficeName] = useState('NIGERIAN PORTS AUTHORITY');
  const [sealOfficeTitle, setSealOfficeTitle] = useState('');
  const [sealPrefix, setSealPrefix] = useState('NPA');
  const [require2fa, setRequire2fa] = useState(true);

  // Load signature from backend
  useEffect(() => {
    const loadSignature = async () => {
      if (!currentUser?.id) return;
      
      setIsLoading(true);
      try {
        const sig = await fetchUserSignature();
        if (sig) {
          setSignature(sig);
          setSealOfficeName(sig.sealOfficeName || 'NIGERIAN PORTS AUTHORITY');
          setSealOfficeTitle(sig.sealOfficeTitle || '');
          setSealPrefix(sig.sealPrefix || 'NPA');
          setRequire2fa(sig.require2fa ?? true);
        }
      } catch (error) {
        logError('Failed to load signature', error);
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

  const handleSignatureUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
      toast.error(`Signature file must be ${MAX_SIGNATURE_SIZE_MB}MB or less`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or SVG file');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadUserSignature(file, {
        sealOfficeName,
        sealOfficeTitle,
        sealPrefix,
        require2fa,
      });
      
      if (uploaded) {
        setSignature(uploaded);
        toast.success('Signature uploaded successfully');
        setActiveTab('preview'); // Switch to preview tab
      }
    } catch (error) {
      logError('Failed to upload signature', error);
      toast.error('Failed to upload signature. Please try again.');
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
      toast.success('Signature deleted successfully');
    } catch (error) {
      logError('Failed to delete signature', error);
      toast.error('Failed to delete signature');
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!signature) return;
    
    try {
      const updated = await updateSignatureSettings({
        sealOfficeName,
        sealOfficeTitle,
        sealPrefix,
        require2fa,
      });
      
      if (updated) {
        setSignature(updated);
        toast.success('Seal settings saved');
      }
    } catch (error) {
      logError('Failed to save settings', error);
      toast.error('Failed to save settings');
    }
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
              <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!signature}>
                <Eye className="h-4 w-4" />
                Seal Preview
              </TabsTrigger>
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
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleSignatureUpload}
                    disabled={isUploading}
                  />
                  
                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Uploading...
                    </div>
                  )}
                </div>

                {/* Current Signature Preview */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Current Signature</Label>
                  {signature ? (
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg bg-white flex items-center justify-center min-h-[100px]">
                        <img
                          src={signature.imageData}
                          alt="Your signature"
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
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Seal Preview */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border">
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      Live Seal Preview
                    </p>
                    <DigitalSealPreview
                      officeName={sealOfficeName}
                      officeTitle={sealOfficeTitle || `OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`}
                      serialPrefix={sealPrefix}
                      signatureImage={signature.imageData}
                      size={300}
                      showQR={true}
                    />
                    <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                      This is how your seal will appear on approved documents
                    </p>
                  </div>

                  {/* Seal Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium">Seal Settings</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sealOfficeName">Organization Name</Label>
                        <Input
                          id="sealOfficeName"
                          value={sealOfficeName}
                          onChange={(e) => setSealOfficeName(e.target.value)}
                          placeholder="NIGERIAN PORTS AUTHORITY"
                        />
                        <p className="text-xs text-muted-foreground">
                          Text displayed at the top of the seal
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sealOfficeTitle">Office Title</Label>
                        <Input
                          id="sealOfficeTitle"
                          value={sealOfficeTitle}
                          onChange={(e) => setSealOfficeTitle(e.target.value)}
                          placeholder={`OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`}
                        />
                        <p className="text-xs text-muted-foreground">
                          Text displayed at the bottom of the seal
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sealPrefix">Serial Number Prefix</Label>
                        <Input
                          id="sealPrefix"
                          value={sealPrefix}
                          onChange={(e) => setSealPrefix(e.target.value.toUpperCase())}
                          placeholder="NPA"
                          maxLength={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          Prefix for seal serial numbers (e.g., NPA-MD-XXXXXXXX)
                        </p>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="require2fa">Require 2FA for Seal</Label>
                          <p className="text-xs text-muted-foreground">
                            Require two-factor authentication before applying seal
                          </p>
                        </div>
                        <Switch
                          id="require2fa"
                          checked={require2fa}
                          onCheckedChange={setRequire2fa}
                        />
                      </div>

                      <Button onClick={handleSaveSettings} className="w-full">
                        Save Seal Settings
                      </Button>
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
            <CardTitle className="text-base">Signature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{signature.timesUsed || 0}</p>
                <p className="text-xs text-muted-foreground">Documents Sealed</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  {signature.lastUsedAt 
                    ? new Date(signature.lastUsedAt).toLocaleDateString() 
                    : 'Never'}
                </p>
                <p className="text-xs text-muted-foreground">Last Used</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  {signature.isActive ? '✓ Active' : '✗ Inactive'}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  {signature.require2fa ? '✓ Enabled' : '✗ Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">2FA Required</p>
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
    </div>
  );
};

export default SignatureSettingsCard;

