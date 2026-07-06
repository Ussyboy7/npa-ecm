import { useCallback, useEffect, useReducer, useRef } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { runOCROnVersion, type DocumentRecord } from '@/lib/dms-storage';
import { processOCR, getCaptureJob, cancelCaptureJob, type CaptureJob } from '@/lib/capture-storage';
import { toast } from 'sonner';

export type OCRState = Record<
  string,
  { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }
>;

type OCRAction =
  | { type: 'SET_PROCESSING'; versionId: string; isProcessing: boolean }
  | { type: 'SET_JOB'; versionId: string; job: CaptureJob | null }
  | { type: 'SET_ERROR'; versionId: string; error: string | null }
  | { type: 'RESET'; versionId: string };

const ocrReducer = (state: OCRState, action: OCRAction): OCRState => {
  switch (action.type) {
    case 'SET_PROCESSING':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId],
          isProcessing: action.isProcessing,
        },
      };
    case 'SET_JOB':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId] ?? { isProcessing: false, currentJob: null, error: null },
          currentJob: action.job,
        },
      };
    case 'SET_ERROR':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId] ?? { isProcessing: false, currentJob: null, error: null },
          error: action.error,
          isProcessing: false,
        },
      };
    case 'RESET': {
      const { [action.versionId]: _, ...rest } = state;
      return rest;
    }
    default:
      return state;
  }
};

interface UseDocumentOcrOptions {
  document: DocumentRecord | null;
  refreshDocument: () => Promise<DocumentRecord | null | void>;
}

export function useDocumentOcr({ document, refreshDocument }: UseDocumentOcrOptions) {
  const [ocrState, dispatchOCR] = useReducer(ocrReducer, {});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const pollOCRJobStatus = useCallback(
    async (versionId: string, jobId: string) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      let pollCount = 0;
      const maxPolls = 150;

      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          const updatedJob = await getCaptureJob(jobId);

          if (pollIntervalRef.current !== pollInterval) return;

          dispatchOCR({
            type: 'SET_PROCESSING',
            versionId,
            isProcessing:
              updatedJob.status !== 'completed' &&
              updatedJob.status !== 'failed' &&
              updatedJob.status !== 'cancelled',
          });
          dispatchOCR({ type: 'SET_JOB', versionId, job: updatedJob });
          dispatchOCR({
            type: 'SET_ERROR',
            versionId,
            error: updatedJob.status === 'failed' ? updatedJob.error_message || 'OCR processing failed' : null,
          });

          if (updatedJob.status === 'completed') {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
            toast.success('OCR processing completed');
            await refreshDocument();
          } else if (updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
            if (updatedJob.status === 'failed') {
              toast.error(updatedJob.error_message || 'OCR processing failed');
            }
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
            dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
            dispatchOCR({ type: 'SET_JOB', versionId, job: updatedJob });
            dispatchOCR({
              type: 'SET_ERROR',
              versionId,
              error: 'OCR processing timed out. The job may still be running in the background.',
            });
            toast.warning('OCR processing is taking longer than expected. Please check back later.');
          }
        } catch (err: unknown) {
          logError('Failed to poll OCR job status', err);
          if (pollCount >= 10) {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
            dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
            dispatchOCR({ type: 'SET_JOB', versionId, job: null });
            const errorMsg =
              err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
                ? err.message
                : 'Failed to check OCR status. The Celery worker may not be running.';
            dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
            toast.error('Failed to check OCR status. Please ensure the backend worker is running.');
          }
        }
      }, 2000);

      pollIntervalRef.current = pollInterval;

      setTimeout(() => {
        if (pollIntervalRef.current === pollInterval) {
          clearInterval(pollInterval);
          pollIntervalRef.current = null;
        }
        getCaptureJob(jobId)
          .then((finalJob) => {
            if (finalJob.status === 'processing') {
              dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
              dispatchOCR({ type: 'SET_JOB', versionId, job: finalJob });
              dispatchOCR({
                type: 'SET_ERROR',
                versionId,
                error: 'OCR processing timed out. The job may still be running in the background.',
              });
            }
          })
          .catch((err) => {
            logWarn('[OCR] Final status check failed:', err);
          });
      }, 5 * 60 * 1000);
    },
    [refreshDocument],
  );

  const handleVersionOCR = useCallback(
    async (versionId: string) => {
      if (!document) return;

      const version = document.versions.find((v) => v.id === versionId);
      if (!version) return;

      const isWordDoc =
        version.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        version.fileType === 'application/msword' ||
        version.fileName?.toLowerCase().endsWith('.docx') ||
        version.fileName?.toLowerCase().endsWith('.doc');

      if ((version.contentHtml && version.contentHtml.trim() !== '') || isWordDoc) {
        try {
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
          dispatchOCR({ type: 'SET_JOB', versionId, job: null });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

          const result = await runOCROnVersion(versionId);

          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: null });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

          const method = isWordDoc ? 'Word document' : 'HTML content';
          toast.success(`Text extracted from ${method} (${result.characters} characters)`);
          await refreshDocument();
          return;
        } catch (err: unknown) {
          const errorMsg =
            err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
              ? err.message
              : isWordDoc
                ? 'Failed to extract text from Word document'
                : 'Failed to extract text from HTML';
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: null });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
          toast.error(errorMsg);
          logError(`Failed to extract text from ${isWordDoc ? 'Word document' : 'HTML'}`, err);
          return;
        }
      }

      if (!version.fileUrl || version.fileUrl.trim() === '') {
        toast.error('No file available for OCR processing');
        return;
      }

      dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
      dispatchOCR({ type: 'SET_JOB', versionId, job: null });
      dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

      try {
        const job = await processOCR(document.id, {
          language: 'eng',
          extract_metadata: true,
        });

        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
        dispatchOCR({ type: 'SET_JOB', versionId, job });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

        if (job.status === 'completed') {
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: null });
          toast.success('OCR processing completed');
          await refreshDocument();
        } else {
          toast.info('OCR processing started. This may take a few moments...');
          void pollOCRJobStatus(versionId, job.id);
        }
      } catch (err: unknown) {
        const errorMsg =
          err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Failed to start OCR processing. Ensure Celery worker is running.';
        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
        dispatchOCR({ type: 'SET_JOB', versionId, job: null });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
        toast.error(errorMsg);
        logError('Failed to process OCR', err);
      }
    },
    [document, pollOCRJobStatus, refreshDocument],
  );

  const handleCancelOCR = useCallback(async (versionId: string) => {
    const state = ocrState[versionId];
    if (!state?.currentJob) return;

    try {
      await cancelCaptureJob(state.currentJob.id);
      dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
      dispatchOCR({ type: 'SET_JOB', versionId, job: null });
      dispatchOCR({ type: 'SET_ERROR', versionId, error: null });
      toast.info('OCR processing cancelled');
    } catch (err) {
      logError('Failed to cancel OCR job', err);
      toast.error('Failed to cancel OCR processing');
    }
  }, [ocrState]);

  return { ocrState, handleVersionOCR, handleCancelOCR };
}
