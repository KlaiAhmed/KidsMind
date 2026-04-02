import { apiClient } from '../../lib/api';
import { useApiQuery, type UseApiQueryResult } from './core';

export interface AuditLogEntry {
  id: string;
  action: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditLogResponse {
  page: number;
  total: number;
  entries: AuditLogEntry[];
}

export type UseAuditLogResult = UseApiQueryResult<AuditLogResponse>;

interface RawAuditLogPayload {
  page?: number;
  total?: number;
  entries?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
}

const normalizeEntry = (entry: Record<string, unknown>, index: number): AuditLogEntry => {
  return {
    id: String(entry.id ?? entry.audit_id ?? index + 1),
    action: String(entry.action ?? 'unknown'),
    created_at: String(entry.created_at ?? entry.timestamp ?? ''),
    ip_address: typeof entry.ip_address === 'string' ? entry.ip_address : undefined,
    user_agent: typeof entry.user_agent === 'string' ? entry.user_agent : undefined,
  };
};

const normalizeAuditLog = (page: number, payload: RawAuditLogPayload): AuditLogResponse => {
  const source = Array.isArray(payload.entries)
    ? payload.entries
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return {
    page: payload.page ?? page,
    total: payload.total ?? source.length,
    entries: source.map(normalizeEntry),
  };
};

export const useAuditLog = (page: number): UseAuditLogResult => {
  return useApiQuery<AuditLogResponse>({
    queryKey: `audit-log:${page}`,
    queryFn: async (signal) => {
      const response = await apiClient.get<RawAuditLogPayload>('/api/v1/users/me/audit-log', {
        signal,
        query: { page },
      });

      return {
        ...response,
        data: normalizeAuditLog(page, response.data),
      };
    },
  });
};
