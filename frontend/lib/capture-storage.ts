/**
 * Frontend API client for content capture (OCR, scanning, batch processing).
 */

import { apiFetch } from './api-client';
import { logError } from './client-logger';

export interface CaptureJob {
  id: string;
  job_type: 'ocr' | 'scan' | 'batch' | 'metadata';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  document?: {
    id: string;
    title: string;
  };
  document_id?: string;
  config: {
    language?: string;
    extract_metadata?: boolean;
  };
  result?: {
    ocr_result_id?: string;
    text_length?: number;
    confidence_score?: number;
    page_count?: number;
    metadata?: Record<string, unknown>;
  };
  error_message?: string;
  processing_time_seconds?: number;
  progress_percentage: number;
  total_items: number;
  processed_items: number;
  created_at: string;
  updated_at: string;
}

export interface OCRResult {
  id: string;
  capture_job: CaptureJob;
  document: {
    id: string;
    title: string;
  };
  extracted_text: string;
  full_text: string;
  confidence_score: number;
  language: string;
  page_count: number;
  page_results: Array<{
    page: number;
    text: string;
    confidence: number;
  }>;
  processing_time_seconds: number;
  ocr_engine: string;
  created_at: string;
  updated_at: string;
}

export interface BatchUpload {
  id: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'partial';
  created_by?: {
    id: string;
    name: string;
  };
  total_files: number;
  processed_files: number;
  successful_files: number;
  failed_files: number;
  documents: Array<{
    id: string;
    title: string;
  }>;
  errors: Array<{
    file: string;
    error: string;
  }>;
  process_ocr: boolean;
  extract_metadata: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Process OCR for a document.
 */
export const processOCR = async (
  documentId: string,
  options: {
    language?: string;
    extract_metadata?: boolean;
  } = {}
): Promise<CaptureJob> => {
  try {
    const response = await apiFetch<CaptureJob>('/capture/operations/process_ocr/', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        language: options.language || 'eng',
        extract_metadata: options.extract_metadata || false,
      }),
    });
    return response;
  } catch (error) {
    logError('Failed to process OCR', error);
    throw error;
  }
};

/**
 * Get capture job status.
 */
export const getCaptureJob = async (jobId: string): Promise<CaptureJob> => {
  try {
    const response = await apiFetch<CaptureJob>(`/capture/jobs/${jobId}/`);
    return response;
  } catch (error) {
    logError('Failed to get capture job', error);
    throw error;
  }
};

/**
 * Get OCR result for a document.
 */
export const getOCRResult = async (documentId: string): Promise<OCRResult | null> => {
  try {
    const response = await apiFetch<OCRResult[]>(`/capture/ocr-results/?document=${documentId}`);
    // Return the most recent result
    return response && response.length > 0 ? response[0] : null;
  } catch (error) {
    logError('Failed to get OCR result', error);
    return null;
  }
};

/**
 * Cancel a capture job.
 */
export const cancelCaptureJob = async (jobId: string): Promise<void> => {
  try {
    await apiFetch(`/capture/jobs/${jobId}/cancel/`, {
      method: 'POST',
    });
  } catch (error) {
    logError('Failed to cancel capture job', error);
    throw error;
  }
};

/**
 * Process multiple documents in batch.
 */
export const processBatch = async (
  documentIds: string[],
  options: {
    process_ocr?: boolean;
    extract_metadata?: boolean;
    language?: string;
  } = {}
): Promise<BatchUpload> => {
  try {
    const response = await apiFetch<BatchUpload>('/capture/operations/batch_process/', {
      method: 'POST',
      body: JSON.stringify({
        document_ids: documentIds,
        process_ocr: options.process_ocr || false,
        extract_metadata: options.extract_metadata || false,
        language: options.language || 'eng',
      }),
    });
    return response;
  } catch (error) {
    logError('Failed to process batch', error);
    throw error;
  }
};

/**
 * Get batch upload status.
 */
export const getBatchUpload = async (batchId: string): Promise<BatchUpload> => {
  try {
    const response = await apiFetch<BatchUpload>(`/capture/batch-uploads/${batchId}/`);
    return response;
  } catch (error) {
    logError('Failed to get batch upload', error);
    throw error;
  }
};

