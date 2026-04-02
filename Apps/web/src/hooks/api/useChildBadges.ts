import { apiClient } from '../../lib/api';
import { useApiQuery, type UseApiQueryResult } from './core';

export type BadgeCategory = 'streak' | 'mastery' | 'exploration' | 'other';

export interface ChildBadge {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: BadgeCategory;
  earned_at: string | null;
}

export interface ChildBadgesResponse {
  badges: ChildBadge[];
}

export type UseChildBadgesResult = UseApiQueryResult<ChildBadgesResponse>;

interface RawBadgesPayload {
  badges?: Array<Record<string, unknown>>;
}

const normalizeCategory = (value: unknown): BadgeCategory => {
  if (value === 'streak' || value === 'mastery' || value === 'exploration') {
    return value;
  }

  return 'other';
};

const normalizeBadges = (payload: RawBadgesPayload | Array<Record<string, unknown>>): ChildBadge[] => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.badges)
      ? payload.badges
      : [];

  return source.map((badge, index) => ({
    id: String(badge.id ?? badge.badge_id ?? index + 1),
    icon: String(badge.icon ?? '🏅'),
    name: String(badge.name ?? 'Badge'),
    description: String(badge.description ?? ''),
    category: normalizeCategory(badge.category),
    earned_at: typeof badge.earned_at === 'string' ? badge.earned_at : null,
  }));
};

export const useChildBadges = (childId: number | null): UseChildBadgesResult => {
  return useApiQuery<ChildBadgesResponse>({
    queryKey: `child-badges:${childId ?? 'none'}`,
    enabled: childId !== null,
    queryFn: async (signal) => {
      const response = await apiClient.get<RawBadgesPayload | Array<Record<string, unknown>>>(`/api/v1/children/${childId}/badges`, {
        signal,
      });

      return {
        ...response,
        data: {
          badges: normalizeBadges(response.data),
        },
      };
    },
  });
};
