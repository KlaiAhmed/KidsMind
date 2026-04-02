import { apiClient } from '../../lib/api';
import { useApiQuery, type UseApiQueryResult } from './core';

export interface ChildSessionSummary {
  session_id: string;
  started_at: string;
  duration_minutes: number;
  subjects: string[];
  message_count: number;
  avg_score: number | null;
}

export interface ChildSessionsResponse {
  page: number;
  page_size: number;
  total: number;
  sessions: ChildSessionSummary[];
}

export type UseChildSessionsResult = UseApiQueryResult<ChildSessionsResponse>;

interface RawSessionsPayload {
  page?: number;
  page_size?: number;
  total?: number;
  sessions?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
}

const toNumber = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const toNullableNumber = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const mapSession = (session: Record<string, unknown>, index: number): ChildSessionSummary => {
  return {
    session_id: String(session.session_id ?? session.id ?? `${index + 1}`),
    started_at: String(session.started_at ?? session.created_at ?? ''),
    duration_minutes: toNumber(session.duration_minutes ?? session.duration),
    subjects: Array.isArray(session.subjects)
      ? session.subjects.filter((subject): subject is string => typeof subject === 'string')
      : typeof session.subject === 'string'
        ? [session.subject]
        : [],
    message_count: toNumber(session.message_count ?? session.messages_count),
    avg_score: toNullableNumber(session.avg_score ?? session.average_score),
  };
};

const normalizeSessions = (page: number, pageSize: number, payload: RawSessionsPayload): ChildSessionsResponse => {
  const source = Array.isArray(payload.sessions)
    ? payload.sessions
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return {
    page: payload.page ?? page,
    page_size: payload.page_size ?? pageSize,
    total: payload.total ?? source.length,
    sessions: source.map(mapSession),
  };
};

export const useChildSessions = (
  childId: number | null,
  page: number,
  pageSize = 20
): UseChildSessionsResult => {
  return useApiQuery<ChildSessionsResponse>({
    queryKey: `child-sessions:${childId ?? 'none'}:${page}:${pageSize}`,
    enabled: childId !== null,
    queryFn: async (signal) => {
      const response = await apiClient.get<RawSessionsPayload>(`/api/v1/children/${childId}/sessions`, {
        signal,
        query: {
          page,
          page_size: pageSize,
        },
      });

      return {
        ...response,
        data: normalizeSessions(page, pageSize, response.data),
      };
    },
  });
};
