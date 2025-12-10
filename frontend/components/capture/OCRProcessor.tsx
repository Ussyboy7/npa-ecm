"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle2, XCircle, RefreshCw, Eye } from 'lucide-react';
import { processOCR, getCaptureJob, getOCRResult, cancelCaptureJob, type CaptureJob, type OCRResult } from '@/lib/capture-storage';
import { logError } from '@/lib/client-logger';

interface OCRProcessorProps {
  documentId: string;
  onOCRComplete?: (result: OCRResult) => void;
}

export const OCRProcessor = ({ documentId, onOCRComplete }: OCRProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<CaptureJob | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  // Poll for job status
  useEffect(() => {
    if (!currentJob) {
      return;
    }

    // If job is already completed, fetch result immediately
    if (currentJob.status === 'completed') {
      setIsProcessing(false);
      const fetchResult = async () => {
        try {
          const result = await getOCRResult(documentId);
          if (result) {
            setOcrResult(result);
            onOCRComplete?.(result);
          }
        } catch (err) {
          logError('Failed to fetch OCR result', err);
        }
      };
      void fetchResult();
      return;
    }

    // If job is failed or cancelled, stop processing
    if (currentJob.status === 'failed' || currentJob.status === 'cancelled') {
      setIsProcessing(false);
      if (currentJob.status === 'failed') {
        setError(currentJob.error_message || 'OCR processing failed');
        toast.error('OCR processing failed');
      }
      return;
    }

    // Poll for status updates
    const pollInterval = setInterval(async () => {
      try {
        const updatedJob = await getCaptureJob(currentJob.id);
        setCurrentJob(updatedJob);

        if (updatedJob.status === 'completed') {
          setIsProcessing(false);
          // Fetch OCR result
          const result = await getOCRResult(documentId);
          if (result) {
            setOcrResult(result);
            onOCRComplete?.(result);
            toast.success('OCR processing completed');
          }
        } else if (updatedJob.status === 'failed') {
          setIsProcessing(false);
          setError(updatedJob.error_message || 'OCR processing failed');
          toast.error('OCR processing failed');
        } else if (updatedJob.status === 'cancelled') {
          setIsProcessing(false);
        }
      } catch (err) {
        logError('Failed to poll OCR job status', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentJob, documentId, onOCRComplete]);

  // Load existing OCR result on mount
  useEffect(() => {
    const loadExistingResult = async () => {
      try {
        const result = await getOCRResult(documentId);
        if (result) {
          setOcrResult(result);
        }
      } catch (err) {
        // Ignore errors when loading
      }
    };

    loadExistingResult();
  }, [documentId]);

  const handleProcessOCR = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setOcrResult(null);

      const job = await processOCR(documentId, {
        language: 'eng',
        extract_metadata: true,
      });

      setCurrentJob(job);
      
      // If job is already completed (very fast processing), handle it immediately
      if (job.status === 'completed') {
        setIsProcessing(false);
        try {
          const result = await getOCRResult(documentId);
          if (result) {
            setOcrResult(result);
            onOCRComplete?.(result);
            toast.success('OCR processing completed');
          }
        } catch (err) {
          logError('Failed to fetch OCR result', err);
        }
      } else {
        toast.info('OCR processing started');
      }
    } catch (err: any) {
      setIsProcessing(false);
      const errorMsg = err?.message || 'Failed to start OCR processing';
      setError(errorMsg);
      toast.error(errorMsg);
      logError('Failed to process OCR', err);
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;

    try {
      await cancelCaptureJob(currentJob.id);
      setCurrentJob(null);
      setIsProcessing(false);
      toast.info('OCR processing cancelled');
    } catch (err) {
      logError('Failed to cancel OCR job', err);
      toast.error('Failed to cancel OCR processing');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          OCR Processing
        </CardTitle>
        <CardDescription>
          Extract text from scanned documents or images using Optical Character Recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentJob && currentJob.status === 'completed' && !isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">{ocrResult ? 'OCR Result Available' : 'OCR Processing Completed'}</span>
              </div>
              <div className="flex items-center gap-2">
                {ocrResult && (
                  <>
                    <Badge variant="outline">
                      {ocrResult.confidence_score ? `${(ocrResult.confidence_score * 100).toFixed(1)}%` : 'N/A'} confidence
                    </Badge>
                    {ocrResult.page_count > 0 && (
                      <Badge variant="outline">{ocrResult.page_count} page{ocrResult.page_count !== 1 ? 's' : ''}</Badge>
                    )}
                  </>
                )}
                {currentJob.processing_time_seconds && (
                  <Badge variant="outline">
                    {currentJob.processing_time_seconds.toFixed(1)}s
                  </Badge>
                )}
              </div>
            </div>

            {ocrResult?.extracted_text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {ocrResult.extracted_text.length} characters extracted
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowText(!showText)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showText ? 'Hide' : 'Show'} Text
                  </Button>
                </div>
                {showText && (
                  <ScrollArea className="h-64 w-full rounded-md border p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {ocrResult.extracted_text}
                    </pre>
                  </ScrollArea>
                )}
              </div>
            )}

            {!ocrResult && (
              <p className="text-sm text-muted-foreground">
                OCR processing completed. Reloading document to show extracted text...
              </p>
            )}
          </div>
        )}

        {currentJob && isProcessing && currentJob.status !== 'completed' && currentJob.status !== 'failed' && currentJob.status !== 'cancelled' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Processing OCR...</span>
              </div>
              {getStatusBadge(currentJob.status)}
            </div>

            {currentJob.progress_percentage > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{currentJob.progress_percentage}%</span>
                </div>
                <Progress value={currentJob.progress_percentage} />
              </div>
            )}

            {currentJob.processing_time_seconds && (
              <p className="text-sm text-muted-foreground">
                Processing time: {currentJob.processing_time_seconds.toFixed(1)}s
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="w-full"
            >
              Cancel Processing
            </Button>
          </div>
        )}

        {!ocrResult && !isProcessing && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Extract searchable text from scanned documents or images. This process may take a few moments.
            </p>
            <Button
              onClick={handleProcessOCR}
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Process OCR
                </>
              )}
            </Button>
          </div>
        )}

        {ocrResult && !isProcessing && (
          <Button
            variant="outline"
            onClick={handleProcessOCR}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-process OCR
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

