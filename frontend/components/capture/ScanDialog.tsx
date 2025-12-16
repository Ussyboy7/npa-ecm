"use client";

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Scan, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createDocument, createDocumentVersion } from '@/lib/dms-storage';
import { processOCR } from '@/lib/capture-storage';
import { logError } from '@/lib/client-logger';
import { useRouter } from 'next/navigation';

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SCAN_ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
];

export const ScanDialog = ({ open, onOpenChange }: ScanDialogProps) => {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'manual' | 'scanner'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File exceeds maximum size of 10MB`);
      return;
    }

    if (!SCAN_ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.type}. Please use PDF or image files.`);
      return;
    }

    setScannedFile(file);
  }, []);

  const handleScan = useCallback(async () => {
    if (scanMode === 'scanner') {
      // Placeholder for actual scanner integration
      toast.info('Scanner integration coming soon. Please use manual upload for now.');
      return;
    }

    if (!scannedFile) {
      toast.error('Please select a file to scan');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    try {
      // Step 1: Read file
      setScanProgress(10);
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(scannedFile);
      });

      // Step 2: Create document with version
      setScanProgress(30);
      const document = await createDocument(
        {
          title: scannedFile.name.replace(/\.[^/.]+$/, ''),
          documentType: 'other',
          status: 'draft',
          sensitivity: 'internal',
        },
        {
          fileName: scannedFile.name,
          fileType: scannedFile.type || 'application/octet-stream',
          fileSize: scannedFile.size,
          fileUrl,
          notes: `Scanned document: ${scannedFile.name}`,
        }
      );

      setDocumentId(document.id);

      // Step 3: Process OCR automatically
      setScanProgress(70);
      try {
        await processOCR(document.id, {
          language: 'eng',
          extract_metadata: true,
        });
        setScanProgress(90);
        toast.success('Document scanned and OCR processing started');
      } catch (error) {
        logError('Failed to start OCR processing', error);
        // Continue even if OCR fails
      }

      setScanProgress(100);
      toast.success('Document scanned successfully');
      
      // Navigate to document after a short delay
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/dms/${document.id}`);
      }, 1000);

    } catch (error: any) {
      logError('Scan failed', error);
      toast.error(error?.message || 'Failed to scan document');
      setIsScanning(false);
      setScanProgress(0);
    }
  }, [scannedFile, scanMode, router, onOpenChange]);

  const handleClose = useCallback(() => {
    if (!isScanning) {
      setScannedFile(null);
      setDocumentId(null);
      setScanProgress(0);
      setScanMode('manual');
      onOpenChange(false);
    }
  }, [isScanning, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Document Scanning
          </DialogTitle>
          <DialogDescription>
            Scan physical documents or upload scanned files to digitize them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scan Mode Selection */}
          <div className="space-y-2">
            <Label>Scan Mode</Label>
            <Select value={scanMode} onValueChange={(value: 'manual' | 'scanner') => setScanMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Upload (Upload scanned file)</SelectItem>
                <SelectItem value="scanner">Scanner Device (Coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scanMode === 'scanner' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Scanner device integration is coming soon. For now, please use manual upload to add scanned documents.
              </AlertDescription>
            </Alert>
          )}

          {scanMode === 'manual' && (
            <>
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload Scanned Document</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {scannedFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                      <p className="text-sm font-medium">{scannedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(scannedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScannedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        disabled={isScanning}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Click to select or drag and drop</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        PDF, PNG, JPG, TIFF (max 10MB)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                      >
                        Select File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.tiff"
                        onChange={handleFileSelect}
                        disabled={isScanning}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Progress */}
              {isScanning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Scanning Progress</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <Progress value={scanProgress} />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button onClick={handleScan} disabled={!scannedFile || isScanning || scanMode === 'scanner'}>
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Scan Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

