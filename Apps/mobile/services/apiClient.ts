// Apps/mobile/services/apiClient.ts
export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  authToken?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

function getConfiguredApiBaseUrl(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const baseUrl = envBaseUrl && envBaseUrl.trim().length > 0 ? envBaseUrl : 'http://localhost:8000';
  return baseUrl.replace(/\/+$/, '');
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getConfiguredApiBaseUrl()}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, authToken, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...restOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Accept', 'application/json');

    let requestBody: BodyInit | undefined;

    if (body instanceof FormData) {
      requestBody = body;
    } else if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }

    if (authToken) {
      requestHeaders.set('Authorization', `Bearer ${authToken}`);
    }

    const response = await fetch(buildUrl(path), {
      ...restOptions,
      body: requestBody,
      headers: requestHeaders,
      signal: controller.signal,
    });

    const parsed = await parseResponse(response);

    if (!response.ok) {
      const message =
        typeof parsed === 'object' &&
        parsed !== null &&
        'detail' in parsed &&
        typeof (parsed as { detail?: unknown }).detail === 'string'
          ? ((parsed as { detail: string }).detail)
          : 'Request failed. Please try again.';

      throw new ApiClientError(message, response.status, parsed);
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('The request timed out. Please try again.', 408);
    }

    throw new ApiClientError('Could not connect to KidsMind services.', 0, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl(): string {
  return getConfiguredApiBaseUrl();
}
