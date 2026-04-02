import { apiClient } from '../../lib/api';
import { useApiQuery, type UseApiQueryResult } from './core';

export type AnalyticsRange = '7d' | '30d' | 'all';

export interface ChildAnalyticsDay {
  date: string;
  minutes_used: number;
  sessions: number;
  exercises: number;
  avg_score: number | null;
  status?: string;
  subject?: string;
}

export interface ChildAnalyticsSummary {
  today_minutes?: number;
  exercise_count?: number;
  average_score?: number;
}

export interface ChildAnalyticsResponse {
  child_id: number;
  range: AnalyticsRange;
  by_day: ChildAnalyticsDay[];
  summary?: ChildAnalyticsSummary;
}

export type UseChildAnalyticsResult = UseApiQueryResult<ChildAnalyticsResponse>;

interface RawAnalyticsPayload {
  child_id?: number;
  range?: AnalyticsRange;
  by_day?: Array<Record<string, unknown>>;
  days?: Array<Record<string, unknown>>;
  summary?: ChildAnalyticsSummary;
}

const toNumber = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const toNullableNumber = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const mapDay = (day: Record<string, unknown>): ChildAnalyticsDay => {
  return {
    date: String(day.date ?? day.day ?? ''),
    minutes_used: toNumber(day.minutes_used ?? day.minutes ?? day.duration_minutes),
    sessions: toNumber(day.sessions ?? day.session_count),
    exercises: toNumber(day.exercises ?? day.exercise_count),
    avg_score: toNullableNumber(day.avg_score ?? day.average_score),
    status: typeof day.status === 'string' ? day.status : undefined,
    subject: typeof day.subject === 'string' ? day.subject : undefined,
  };
};

const normalizeAnalytics = (childId: number, range: AnalyticsRange, payload: RawAnalyticsPayload): ChildAnalyticsResponse => {
  const sourceDays = Array.isArray(payload.by_day)
    ? payload.by_day
    : Array.isArray(payload.days)
      ? payload.days
      : [];

  return {
    child_id: payload.child_id ?? childId,
    range: payload.range ?? range,
    by_day: sourceDays.map(mapDay),
    summary: payload.summary,
  };
};

export const useChildAnalytics = (childId: number | null, range: AnalyticsRange): UseChildAnalyticsResult => {
  return useApiQuery<ChildAnalyticsResponse>({
    queryKey: `child-analytics:${childId ?? 'none'}:${range}`,
    enabled: childId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async (signal) => {
      const response = await apiClient.get<RawAnalyticsPayload>(`/api/v1/children/${childId}/analytics`, {
        signal,
        query: { range },
      });

      return {
        ...response,
        data: normalizeAnalytics(childId ?? 0, range, response.data),
      };
    },
  });
};
