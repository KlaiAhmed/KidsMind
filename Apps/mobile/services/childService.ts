// Apps/mobile/services/childService.ts
import type { AgeGroup, ChildProfile } from '@/types/child';
import type { Badge, BadgeApiItem } from '@/types/badge';
import { apiRequest } from '@/services/apiClient';

interface ChildProfileApiResponse {
  id?: string;
  name?: string;
  nickname?: string;
  age?: number;
  age_group?: string;
  grade_level?: string;
  languages?: string[];
  settings_json?: Record<string, unknown>;
  avatar_id?: string;
  subject_ids?: string[];
  xp?: number;
  level?: number;
  xp_to_next_level?: number;
  streak?: number;
  streak_days?: number;
  daily_goal_minutes?: number;
  daily_completed_minutes?: number;
  total_subjects_explored?: number;
  total_exercises_completed?: number;
  total_badges_earned?: number;
}

const BADGE_ICON_ASSETS = [
  require('../assets/images/icon.png'),
  require('../assets/images/splash-icon.png'),
  require('../assets/images/android-icon-foreground.png'),
  require('../assets/images/android-icon-background.png'),
  require('../assets/images/android-icon-monochrome.png'),
  require('../assets/images/react-logo.png'),
  require('../assets/images/partial-react-logo.png'),
] as const;

function isAgeGroup(value: unknown): value is AgeGroup {
  return value === '3-6' || value === '7-11' || value === '12-15';
}

function toAgeFromGroup(group: AgeGroup): number {
  if (group === '3-6') {
    return 6;
  }

  if (group === '7-11') {
    return 10;
  }

  return 13;
}

function toAgeGroup(age: number): AgeGroup {
  if (age <= 6) {
    return '3-6';
  }

  if (age <= 11) {
    return '7-11';
  }

  return '12-15';
}

function normalizeChildProfile(data: ChildProfileApiResponse, requestedChildId: string): ChildProfile {
  const resolvedAgeGroup = isAgeGroup(data.age_group)
    ? data.age_group
    : toAgeGroup(typeof data.age === 'number' ? data.age : 10);

  const resolvedAge = typeof data.age === 'number' ? data.age : toAgeFromGroup(resolvedAgeGroup);
  const xp = typeof data.xp === 'number' ? data.xp : 0;
  const derivedLevel = Math.floor(Math.max(0, xp) / 100) + 1;
  const level = typeof data.level === 'number' ? data.level : derivedLevel;

  return {
    id: data.id ?? requestedChildId,
    name: data.nickname ?? data.name ?? 'Explorer',
    nickname: data.nickname ?? data.name ?? 'Explorer',
    age: resolvedAge,
    ageGroup: resolvedAgeGroup,
    gradeLevel: data.grade_level ?? 'Grade 4',
    languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['en'],
    settingsJson: data.settings_json ?? { daily_limit_minutes: 20 },
    avatarId: data.avatar_id ?? 'avatar-1',
    subjectIds: Array.isArray(data.subject_ids) ? data.subject_ids : [],
    xp,
    level,
    xpToNextLevel: typeof data.xp_to_next_level === 'number' ? data.xp_to_next_level : level * 100,
    streakDays: typeof data.streak_days === 'number' ? data.streak_days : data.streak ?? 0,
    dailyGoalMinutes:
      typeof data.daily_goal_minutes === 'number'
        ? data.daily_goal_minutes
        : typeof data.settings_json?.daily_goal_minutes === 'number'
          ? data.settings_json.daily_goal_minutes
          : 25,
    dailyCompletedMinutes: typeof data.daily_completed_minutes === 'number' ? data.daily_completed_minutes : 0,
    totalSubjectsExplored:
      typeof data.total_subjects_explored === 'number'
        ? data.total_subjects_explored
        : Array.isArray(data.subject_ids)
          ? data.subject_ids.length
          : 0,
    totalExercisesCompleted: typeof data.total_exercises_completed === 'number' ? data.total_exercises_completed : 0,
    totalBadgesEarned: typeof data.total_badges_earned === 'number' ? data.total_badges_earned : 0,
  };
}

function normalizeBadge(item: BadgeApiItem, index: number): Badge {
  const safeName = item.name ?? `Badge ${index + 1}`;

  return {
    id: item.id,
    name: safeName,
    description: item.description ?? `Achievement badge for ${safeName}`,
    iconAsset: BADGE_ICON_ASSETS[index % BADGE_ICON_ASSETS.length],
    earned: Boolean(item.earned),
    earnedAt: item.earned_at ?? null,
    condition: item.condition ?? 'Complete more learning activities to unlock this badge.',
    progressPercent: typeof item.progress_percent === 'number' ? item.progress_percent : undefined,
  };
}

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const response = await apiRequest<ChildProfileApiResponse>(`/children/${childId}`, {
    method: 'GET',
  });

  return normalizeChildProfile(response, childId);
}

export async function getChildBadges(childId: string): Promise<Badge[]> {
  const response = await apiRequest<BadgeApiItem[]>(`/children/${childId}/badges`, {
    method: 'GET',
  });

  return response.map((badge, index) => normalizeBadge(badge, index));
}
