/**
 * Reusable Signature Section Component
 * Handles both Digital Seal (for executive approvals) and Digital Signature
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ImageIcon, Shield, Upload, Settings } from 'lucide-react';
import { DigitalSealPreview } from '@/components/seals/DigitalSealPreview';
import { buildDownloadUrl } from '@/lib/correspondence-url-utils';
import type { StoredSignature, SignatureTemplate } from '@/lib/signature-storage';
import type { User } from '@/lib/npa-structure';

interface SignatureSectionProps {
  signature: StoredSignature | null;
  currentUser: User | null;
  actionType?: 'minute' | 'approve';
  isExecutive?: boolean;
  applySignature: boolean;
  onApplySignatureChange: (checked: boolean) => void;
  signatureTemplates?: SignatureTemplate[];
  selectedTemplateId?: string | null;
  onTemplateChange?: (templateId: string | null) => void;
  templatePreview?: string;
  showTemplateSelector?: boolean;
  disabled?: boolean;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  signature,
  currentUser,
  actionType = 'minute',
  isExecutive = false,
  applySignature,
  onApplySignatureChange,
  signatureTemplates = [],
  selectedTemplateId,
  onTemplateChange,
  templatePreview,
  showTemplateSelector = true,
  disabled = false,
}) => {
  const router = useRouter();
  const isExecutiveApproval = actionType === 'approve' && isExecutive;
  const isNonExecutiveApproval = actionType === 'approve' && !isExecutive;

  // Filter templates by action type
  const relevantTemplates = signatureTemplates.filter(
    (template) => template.templateType === (actionType === 'approve' ? 'approval' : 'minute')
  );

  const selectedTemplate = relevantTemplates.find((t) => t.id === selectedTemplateId);

  // Digital Seal (for Executive Approvals)
  if (isExecutiveApproval) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Digital Executive Seal
          </Label>
          <Badge variant="destructive" className="text-[10px]">Required</Badge>
        </div>
        {signature ? (
          <Card>
            <CardContent className="p-4 bg-white">
              <div className="flex flex-col items-center justify-center space-y-3">
                <DigitalSealPreview
                  officeName={signature.sealOfficeName || 'NIGERIAN PORTS AUTHORITY'}
                  officeTitle={
                    signature.sealOfficeTitle ||
                    `OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`
                  }
                  serialPrefix={signature.sealPrefix || 'NPA'}
                  signatureImage={signature?.imageData?.startsWith('data:') ? signature.imageData : (buildDownloadUrl(signature?.imageData) ?? signature?.imageData)}
                  size={250}
                  showQR={true}
                />
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  This digital seal will be automatically applied when you approve. Your signature is embedded in the
                  seal.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>
                    Signature on file • Uploaded {new Date(signature.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4">
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
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Digital Signature (for non-executive or non-approve actions)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Digital Signature</Label>
        {isNonExecutiveApproval && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
      </div>
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          {signature ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-medium text-foreground">Signature on File</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(signature.uploadedAt).toLocaleString()}{' '}
                    {signature.fileName ? `• ${signature.fileName}` : ''}
                  </p>
                </div>
                <div className="p-3 border rounded-lg bg-background self-start">
                  <img
                    src={signature.imageData}
                    alt="Digital signature preview"
                    className="max-h-24 object-contain"
                  />
                </div>
              </div>

              {showTemplateSelector && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Signature Template</Label>
                  {relevantTemplates.length > 0 ? (
                    <Select
                      value={selectedTemplateId ?? undefined}
                      onValueChange={(value) => onTemplateChange?.(value || null)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {relevantTemplates.map((template) => (
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
              )}

              {selectedTemplate && applySignature && templatePreview && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Template Preview</Label>
                  <div className="p-3 border border-dashed rounded bg-muted/20">
                    <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {selectedTemplate.style}
                      </Badge>
                    </div>
                    <p className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{templatePreview}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground py-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-destructive font-medium">No signature on file.</p>
                <p className="text-xs">
                  Please upload your signature in{' '}
                  <Link href="/settings?tab=signature" className="text-primary underline">
                    Settings → Signature
                  </Link>{' '}
                  before approving correspondence.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push('/settings?tab=signature');
                  }}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signature
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>
                {isNonExecutiveApproval
                  ? 'A digital signature will be applied automatically for this approval.'
                  : 'Apply your signature to this minute for acknowledgement.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={applySignature && !!signature}
                onCheckedChange={(checked) => {
                  if (isNonExecutiveApproval) return;
                  onApplySignatureChange(checked && !!signature);
                }}
                disabled={!signature || isNonExecutiveApproval || disabled}
              />
              <span className="text-xs">
                {isNonExecutiveApproval
                  ? 'Required'
                  : applySignature && signature
                    ? 'Will be applied'
                    : 'Not applied'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

