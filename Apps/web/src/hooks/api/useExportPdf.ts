import { apiClient } from '../../lib/api';
import { useApiMutation, type UseApiMutationResult } from './core';

const COPY = {
  noChild: 'Please select a child profile first.',
  failed: 'PDF export failed. Please try again later.',
  timeout: 'PDF export is taking longer than expected.',
} as const;

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

export interface ExportPdfJobResponse {
  job_id: string;
}

export interface ExportPdfJobStatusResponse {
  status: 'pending' | 'processing' | 'done' | 'failed';
  download_url?: string;
}

export interface ExportPdfResult {
  job_id: string;
  status: 'done';
  download_url: string;
}

export type UseExportPdfResult = UseApiMutationResult<ExportPdfResult, void>;

const wait = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
};

const triggerDownload = (downloadUrl: string): void => {
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.download = '';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const pollJobUntilReady = async (jobId: string): Promise<ExportPdfResult> => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await apiClient.get<ExportPdfJobStatusResponse>(`/api/v1/jobs/${jobId}`);

    if (response.data.status === 'done' && response.data.download_url) {
      triggerDownload(response.data.download_url);
      return {
        job_id: jobId,
        status: 'done',
        download_url: response.data.download_url,
      };
    }

    if (response.data.status === 'failed') {
      throw new Error(COPY.failed);
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error(COPY.timeout);
};

export const useExportPdf = (childId: number | null): UseExportPdfResult => {
  return useApiMutation<ExportPdfResult, void>(async () => {
    if (childId === null) {
      throw new Error(COPY.noChild);
    }

    const startResponse = await apiClient.post<ExportPdfJobResponse>(`/api/v1/children/${childId}/export/pdf`, {
      body: {},
    });

    return pollJobUntilReady(startResponse.data.job_id);
  });
};
