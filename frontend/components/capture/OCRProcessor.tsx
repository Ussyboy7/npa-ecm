"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle2, XCircle, RefreshCw, Eye, AlertTriangle, Languages, Edit2, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { processOCR, getCaptureJob, getOCRResult, cancelCaptureJob, type CaptureJob, type OCRResult } from '@/lib/capture-storage';
import { logError } from '@/lib/client-logger';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface OCRProcessorProps {
  documentId: string;
  onOCRComplete?: (result: OCRResult) => void;
}

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.70,
  LOW: 0.50,
};

export const OCRProcessor = ({ documentId, onOCRComplete }: OCRProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<CaptureJob | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [forceReprocess, setForceReprocess] = useState(false);

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
        language: autoDetectLanguage ? undefined : 'eng',
        auto_detect_language: autoDetectLanguage,
        extract_metadata: true,
        force_reprocess: forceReprocess,
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
    } catch (err: Record<string, unknown>) {
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
                    {ocrResult.confidence_score !== undefined && (
                      <Badge 
                        variant={
                          ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.HIGH 
                            ? "default" 
                            : ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.MEDIUM
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.HIGH 
                            ? "bg-green-500" 
                            : ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.MEDIUM
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }
                      >
                        {ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.HIGH ? '✓' : 
                         ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.MEDIUM ? '⚠' : '✗'} 
                        {' '}
                        {(ocrResult.confidence_score * 100).toFixed(1)}% confidence
                      </Badge>
                    )}
                    {ocrResult.page_count > 0 && (
                      <Badge variant="outline">{ocrResult.page_count} page{ocrResult.page_count !== 1 ? 's' : ''}</Badge>
                    )}
                    {ocrResult.language && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Languages className="h-3 w-3" />
                        {ocrResult.language.toUpperCase()}
                      </Badge>
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

            {ocrResult && ocrResult.confidence_score !== undefined && ocrResult.confidence_score < CONFIDENCE_THRESHOLDS.MEDIUM && (
              <Alert variant={ocrResult.confidence_score < CONFIDENCE_THRESHOLDS.LOW ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  OCR confidence is {(ocrResult.confidence_score * 100).toFixed(1)}%, which is below the recommended threshold.
                  {ocrResult.confidence_score < CONFIDENCE_THRESHOLDS.LOW && (
                    <span className="block mt-1">Consider re-processing with better quality source or different settings.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {ocrResult?.extracted_text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {ocrResult.extracted_text.length} characters extracted
                    {ocrResult.confidence_score !== undefined && (
                      <span className="ml-2">
                        (Quality: {
                          ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.HIGH ? 'High' :
                          ocrResult.confidence_score >= CONFIDENCE_THRESHOLDS.MEDIUM ? 'Medium' : 'Low'
                        })
                      </span>
                    )}
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {isEditing ? 'Editing OCR text' : 'Extracted text (read-only)'}
                      </span>
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(true);
                            setEditedText(ocrResult.extracted_text);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditing(false);
                              setEditedText('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                // Update document version with edited text
                                // Note: This would require an API endpoint to update OCR text
                                // For now, we'll just update local state
                                setOcrResult({
                                  ...ocrResult,
                                  extracted_text: editedText,
                                });
                                setIsEditing(false);
                                toast.success('OCR text updated');
                              } catch (err) {
                                logError('Failed to save edited text', err);
                                toast.error('Failed to save edited text');
                              }
                            }}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-64 font-mono text-sm"
                        placeholder="Edit extracted text..."
                      />
                    ) : (
                      <ScrollArea className="h-64 w-full rounded-md border p-4">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {ocrResult.extracted_text}
                        </pre>
                      </ScrollArea>
                    )}
                  </div>
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
            
            <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-detect-language"
                  checked={autoDetectLanguage}
                  onCheckedChange={(checked) => setAutoDetectLanguage(checked as boolean)}
                  disabled={isProcessing}
                />
                <Label htmlFor="auto-detect-language" className="cursor-pointer text-sm">
                  Auto-detect language
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="force-reprocess"
                  checked={forceReprocess}
                  onCheckedChange={(checked) => setForceReprocess(checked as boolean)}
                  disabled={isProcessing}
                />
                <Label htmlFor="force-reprocess" className="cursor-pointer text-sm">
                  Force re-process (ignore existing OCR results)
                </Label>
              </div>
            </div>

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

