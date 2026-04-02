import { apiClient } from '../../lib/api';
import { useApiQuery, type UseApiQueryResult } from './core';

const SUBJECT_EMOJI_MAP: Record<string, string> = {
  math: '🧮',
  english: '📘',
  french: '🥖',
  science: '🔬',
  history: '🏛️',
  art: '🎨',
};

export type SubjectTrend = 'up' | 'down' | 'stable';

export interface SubjectProgress {
  subject: string;
  emoji: string;
  mastery_pct: number | null;
  trend: SubjectTrend;
  last_practiced_at: string | null;
}

export interface ChildProgressResponse {
  subjects: SubjectProgress[];
}

export type UseChildProgressResult = UseApiQueryResult<ChildProgressResponse>;

interface RawProgressPayload {
  subjects?: Array<Record<string, unknown>> | Record<string, Record<string, unknown>>;
}

const toNullableNumber = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const normalizeTrend = (value: unknown): SubjectTrend => {
  if (value === 'up' || value === 'down' || value === 'stable') {
    return value;
  }

  return 'stable';
};

const toSubjectName = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return 'general';
};

const toSubjectEmoji = (subject: string, fallback?: unknown): string => {
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback;
  }

  return SUBJECT_EMOJI_MAP[subject.toLowerCase()] ?? '📚';
};

const normalizeSubject = (raw: Record<string, unknown>, fallbackSubject?: string): SubjectProgress => {
  const subject = toSubjectName(raw.subject ?? fallbackSubject);

  return {
    subject,
    emoji: toSubjectEmoji(subject, raw.emoji),
    mastery_pct: toNullableNumber(raw.mastery_pct ?? raw.mastery),
    trend: normalizeTrend(raw.trend),
    last_practiced_at: typeof raw.last_practiced_at === 'string' ? raw.last_practiced_at : null,
  };
};

const normalizeProgress = (payload: RawProgressPayload): ChildProgressResponse => {
  if (Array.isArray(payload.subjects)) {
    return {
      subjects: payload.subjects.map((subject) => normalizeSubject(subject)),
    };
  }

  if (payload.subjects && typeof payload.subjects === 'object') {
    const entries = Object.entries(payload.subjects);
    return {
      subjects: entries.map(([subject, values]) => normalizeSubject(values, subject)),
    };
  }

  return {
    subjects: [],
  };
};

export const useChildProgress = (childId: number | null): UseChildProgressResult => {
  return useApiQuery<ChildProgressResponse>({
    queryKey: `child-progress:${childId ?? 'none'}`,
    enabled: childId !== null,
    queryFn: async (signal) => {
      const response = await apiClient.get<RawProgressPayload>(`/api/v1/children/${childId}/progress`, {
        signal,
      });

      return {
        ...response,
        data: normalizeProgress(response.data),
      };
    },
  });
};
