"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Camera, Upload, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QRCodeScannerProps {
  onScan: (serial: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeScanner({ onScan, open, onOpenChange }: QRCodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [open, mode]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      toast.error('Camera access denied. Please use file upload instead.');
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, we'll extract serial from QR code image
    // In a real implementation, you'd use a QR code decoder library
    // For this implementation, we'll show a message to manually enter
    toast.info('QR code image scanning coming soon. Please enter the serial number manually.');
    onOpenChange(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    setMode('camera');
    onOpenChange(false);
  };

  // Manual QR code entry fallback
  const handleManualEntry = () => {
    onOpenChange(false);
    // Focus will return to the input field
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the QR code from the document to verify the seal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upload')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-emerald-500 rounded-lg w-64 h-64" />
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Position the QR code within the frame. Scanning will happen automatically.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Note: Automatic QR code detection requires a QR scanner library. For now, please use manual entry or upload.
              </p>
            </div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-sm text-slate-300 mb-2">Upload QR Code Image</p>
                <p className="text-xs text-slate-500 mb-4">
                  Select an image containing the QR code
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="qr-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
              </div>
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleManualEntry}
              className="w-full"
            >
              Enter Serial Number Manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

