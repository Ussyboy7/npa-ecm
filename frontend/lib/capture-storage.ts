import { apiFetch } from './api-client';

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

function unwrapList<T>(response: T[] | { results?: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'results' in response) {
    const results = (response as { results?: T[] }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

export const listCaptureJobs = async (): Promise<CaptureJob[]> => {
  const response = await apiFetch<CaptureJob[] | { results?: CaptureJob[] }>('/capture/jobs/');
  return unwrapList(response);
};

export const retryCaptureJob = async (jobId: string): Promise<CaptureJob> =>
  apiFetch<CaptureJob>(`/capture/jobs/${jobId}/retry/`, { method: 'POST' });

export const listBatchUploads = async (): Promise<BatchUpload[]> => {
  const response = await apiFetch<BatchUpload[] | { results?: BatchUpload[] }>(
    '/capture/batch-uploads/',
  );
  return unwrapList(response);
};

export const processOCR = async (
  documentId: string,
  options: {
    language?: string;
    auto_detect_language?: boolean;
    extract_metadata?: boolean;
    force_reprocess?: boolean;
  } = {}
): Promise<CaptureJob> =>
  apiFetch<CaptureJob>('/capture/operations/process_ocr/', {
    method: 'POST',
    body: JSON.stringify({
      document_id: documentId,
      language: options.language || 'eng',
      auto_detect_language: options.auto_detect_language || false,
      extract_metadata: options.extract_metadata || false,
      force_reprocess: options.force_reprocess || false,
    }),
  });

export const getCaptureJob = async (jobId: string): Promise<CaptureJob> =>
  apiFetch<CaptureJob>(`/capture/jobs/${jobId}/`);

export const getOCRResult = async (documentId: string): Promise<OCRResult | null> => {
  const response = await apiFetch<OCRResult[] | { results?: OCRResult[] }>(
    `/capture/ocr-results/?document=${documentId}`,
  );
  const results = unwrapList<OCRResult>(response);
  return results.length > 0 ? results[0] : null;
};

export const cancelCaptureJob = async (jobId: string): Promise<void> =>
  apiFetch(`/capture/jobs/${jobId}/cancel/`, { method: 'POST' });

export const processBatch = async (
  documentIds: string[],
  options: {
    process_ocr?: boolean;
    extract_metadata?: boolean;
    language?: string;
  } = {}
): Promise<BatchUpload> =>
  apiFetch<BatchUpload>('/capture/operations/batch_process/', {
    method: 'POST',
    body: JSON.stringify({
      document_ids: documentIds,
      process_ocr: options.process_ocr || false,
      extract_metadata: options.extract_metadata || false,
      language: options.language || 'eng',
    }),
  });

export const getBatchUpload = async (batchId: string): Promise<BatchUpload> =>
  apiFetch<BatchUpload>(`/capture/batch-uploads/${batchId}/`);
