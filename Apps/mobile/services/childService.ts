import type {
  AgeGroup,
  ChildProfile,
  ChildRules,
  ContentSafetyLevel,
  CreateChildProfileInput,
  DaySchedule,
  SubjectKey,
  UpdateChildProfileInput,
  UpdateChildRulesInput,
  WeekSchedule,
  WeekdayKey,
} from '@/types/child';
import type { Badge, BadgeApiItem } from '@/types/badge';
import { apiRequest } from '@/services/apiClient';

interface DayScheduleApiResponse {
  enabled: boolean;
  subjects?: SubjectKey[];
  duration_minutes?: number | null;
}

interface WeekScheduleApiResponse {
  monday?: DayScheduleApiResponse;
  tuesday?: DayScheduleApiResponse;
  wednesday?: DayScheduleApiResponse;
  thursday?: DayScheduleApiResponse;
  friday?: DayScheduleApiResponse;
  saturday?: DayScheduleApiResponse;
  sunday?: DayScheduleApiResponse;
}

interface ChildRulesApiResponse {
  default_language: string;
  daily_limit_minutes: number | null;
  allowed_subjects: SubjectKey[];
  blocked_subjects: SubjectKey[];
  week_schedule: WeekScheduleApiResponse;
  time_window_start: string | null;
  time_window_end: string | null;
  homework_mode_enabled: boolean;
  voice_mode_enabled: boolean;
  audio_storage_enabled: boolean;
  conversation_history_enabled: boolean;
  content_safety_level: ContentSafetyLevel;
}

interface ChildProfileApiResponse {
  id: number;
  parent_id: number;
  nickname: string;
  birth_date: string;
  education_stage: string;
  is_accelerated: boolean;
  is_below_expected_stage: boolean;
  languages: string[];
  avatar: string | null;
  rules: ChildRulesApiResponse | null;
  created_at: string;
  updated_at: string;
  age: number;
  age_group: string;
}

function normalizeEducationStage(value: string): 'KINDERGARTEN' | 'PRIMARY' | 'SECONDARY' {
  if (value === 'KINDERGARTEN') {
    return 'KINDERGARTEN';
  }

  if (value === 'PRIMARY' || value === 'PRIMARY_SCHOOL') {
    return 'PRIMARY';
  }

  return 'SECONDARY';
}

const SUBJECT_VALUES: SubjectKey[] = [
  'math',
  'reading',
  'french',
  'english',
  'science',
  'history',
  'art',
];

const WEEKDAY_KEYS: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

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

function toAgeGroup(age: number): AgeGroup {
  if (age <= 6) {
    return '3-6';
  }

  if (age <= 11) {
    return '7-11';
  }

  return '12-15';
}

function toGradeLevelLabel(educationStage: string, age: number): string {
  if (educationStage === 'KINDERGARTEN') {
    return 'Kindergarten';
  }

  if (educationStage === 'PRIMARY') {
    return 'Primary School';
  }

  if (educationStage === 'SECONDARY') {
    return 'Secondary School';
  }

  if (age <= 6) {
    return 'Kindergarten';
  }

  if (age <= 11) {
    return 'Primary School';
  }

  return 'Secondary School';
}

function isSubjectKey(value: unknown): value is SubjectKey {
  return typeof value === 'string' && SUBJECT_VALUES.includes(value as SubjectKey);
}

function normalizeSubjectKeys(value: unknown): SubjectKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isSubjectKey);
}

function defaultWeekSchedule(): WeekSchedule {
  return {
    monday: { enabled: true, subjects: ['math'], durationMinutes: 30 },
    tuesday: { enabled: true, subjects: ['reading'], durationMinutes: 30 },
    wednesday: { enabled: true, subjects: ['science'], durationMinutes: 30 },
    thursday: { enabled: true, subjects: ['english'], durationMinutes: 30 },
    friday: { enabled: true, subjects: ['art'], durationMinutes: 30 },
    saturday: { enabled: false, subjects: [], durationMinutes: null },
    sunday: { enabled: false, subjects: [], durationMinutes: null },
  };
}

function normalizeDaySchedule(value: DayScheduleApiResponse | undefined): DaySchedule {
  const enabled = Boolean(value?.enabled);
  const subjects = normalizeSubjectKeys(value?.subjects);
  const duration = typeof value?.duration_minutes === 'number' && value.duration_minutes > 0
    ? value.duration_minutes
    : null;

  return {
    enabled,
    subjects,
    durationMinutes: enabled ? duration : null,
  };
}

function normalizeWeekSchedule(value: WeekScheduleApiResponse | undefined): WeekSchedule {
  const fallback = defaultWeekSchedule();

  return WEEKDAY_KEYS.reduce((acc, key) => {
    const rawDay = value?.[key];
    const day = rawDay ? normalizeDaySchedule(rawDay) : fallback[key];
    acc[key] = day;
    return acc;
  }, {} as WeekSchedule);
}

function normalizeRules(value: ChildRulesApiResponse | null): ChildRules | null {
  if (!value) {
    return null;
  }

  return {
    defaultLanguage: value.default_language,
    dailyLimitMinutes: typeof value.daily_limit_minutes === 'number' ? value.daily_limit_minutes : null,
    allowedSubjects: normalizeSubjectKeys(value.allowed_subjects),
    blockedSubjects: normalizeSubjectKeys(value.blocked_subjects),
    weekSchedule: normalizeWeekSchedule(value.week_schedule),
    timeWindowStart: value.time_window_start,
    timeWindowEnd: value.time_window_end,
    homeworkModeEnabled: Boolean(value.homework_mode_enabled),
    voiceModeEnabled: Boolean(value.voice_mode_enabled),
    audioStorageEnabled: Boolean(value.audio_storage_enabled),
    conversationHistoryEnabled: Boolean(value.conversation_history_enabled),
    contentSafetyLevel: value.content_safety_level === 'moderate' ? 'moderate' : 'strict',
  };
}

function normalizeChildProfile(data: ChildProfileApiResponse): ChildProfile {
  const resolvedAge = typeof data.age === 'number' ? data.age : 7;
  const resolvedAgeGroup = isAgeGroup(data.age_group) ? data.age_group : toAgeGroup(resolvedAge);
  const educationStage = normalizeEducationStage(data.education_stage);
  const normalizedRules = normalizeRules(data.rules);
  const subjectIds = normalizedRules?.allowedSubjects ?? [];
  const dailyGoalMinutes = normalizedRules?.dailyLimitMinutes ?? 25;

  return {
    id: String(data.id),
    name: data.nickname,
    nickname: data.nickname,
    birthDate: data.birth_date,
    educationStage,
    age: resolvedAge,
    ageGroup: resolvedAgeGroup,
    gradeLevel: toGradeLevelLabel(educationStage, resolvedAge),
    languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['en'],
    rules: normalizedRules,
    avatarId: data.avatar ?? 'avatar-1',
    subjectIds,
    xp: 0,
    level: 1,
    xpToNextLevel: 100,
    streakDays: 0,
    dailyGoalMinutes,
    dailyCompletedMinutes: 0,
    totalSubjectsExplored: subjectIds.length,
    totalExercisesCompleted: 0,
    totalBadgesEarned: 0,
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

export async function createChildProfile(input: CreateChildProfileInput): Promise<ChildProfile> {
  const body = {
    nickname: input.nickname,
    birth_date: input.birthDate,
    education_stage: input.educationStage,
    age_group: input.ageGroup,
    languages: input.languages,
    avatar: input.avatarId,
  };

  const response = await apiRequest<ChildProfileApiResponse>('/api/v1/children', {
    method: 'POST',
    body,
  });

  return normalizeChildProfile(response);
}

export async function patchChildProfile(
  childId: string | number,
  input: UpdateChildProfileInput,
): Promise<ChildProfile> {
  const numericId = typeof childId === 'number' ? childId : parseInt(childId, 10);

  if (Number.isNaN(numericId)) {
    throw new Error(`Invalid child ID: ${childId}`);
  }

  const body = {
    nickname: input.nickname,
    birth_date: input.birthDate,
    education_stage: input.educationStage,
    age_group: input.ageGroup,
    languages: input.languages,
    avatar: input.avatarId,
  };

  const response = await apiRequest<ChildProfileApiResponse>(`/api/v1/children/${numericId}`, {
    method: 'PATCH',
    body,
  });

  return normalizeChildProfile(response);
}

export async function patchChildRules(
  childId: string | number,
  input: UpdateChildRulesInput,
): Promise<ChildRules> {
  const numericId = typeof childId === 'number' ? childId : parseInt(childId, 10);

  if (Number.isNaN(numericId)) {
    throw new Error(`Invalid child ID: ${childId}`);
  }

  const body = {
    default_language: input.defaultLanguage,
    daily_limit_minutes: input.dailyLimitMinutes,
    allowed_subjects: input.allowedSubjects,
    blocked_subjects: input.blockedSubjects,
    week_schedule: WEEKDAY_KEYS.reduce((acc, key) => {
      const day = input.weekSchedule[key];
      acc[key] = {
        enabled: day.enabled,
        subjects: day.subjects,
        duration_minutes: day.enabled ? day.durationMinutes : null,
      };
      return acc;
    }, {} as Record<WeekdayKey, { enabled: boolean; subjects: SubjectKey[]; duration_minutes: number | null }>),
    time_window_start: input.timeWindowStart,
    time_window_end: input.timeWindowEnd,
    homework_mode_enabled: input.homeworkModeEnabled,
    voice_mode_enabled: input.voiceModeEnabled,
    audio_storage_enabled: input.audioStorageEnabled,
    conversation_history_enabled: input.conversationHistoryEnabled,
    content_safety_level: input.contentSafetyLevel,
  };

  const response = await apiRequest<ChildRulesApiResponse>(`/api/v1/children/${numericId}/rules`, {
    method: 'PATCH',
    body,
  });

  const normalized = normalizeRules(response);
  if (!normalized) {
    throw new Error('Unexpected empty rules payload');
  }

  return normalized;
}

export async function listChildProfiles(): Promise<ChildProfile[]> {
  const response = await apiRequest<ChildProfileApiResponse[]>('/api/v1/children', {
    method: 'GET',
  });

  return response.map(normalizeChildProfile);
}

export async function getChildProfile(childId: string | number): Promise<ChildProfile> {
  const numericId = typeof childId === 'number' ? childId : parseInt(childId, 10);

  if (Number.isNaN(numericId)) {
    throw new Error(`Invalid child ID: ${childId}`);
  }

  const response = await apiRequest<ChildProfileApiResponse>(`/api/v1/children/${numericId}`, {
    method: 'GET',
  });

  return normalizeChildProfile(response);
}

export async function getChildBadges(childId: string | number): Promise<Badge[]> {
  const numericId = typeof childId === 'number' ? childId : parseInt(childId, 10);

  if (Number.isNaN(numericId)) {
    throw new Error(`Invalid child ID: ${childId}`);
  }

  const response = await apiRequest<BadgeApiItem[]>(`/api/v1/children/${numericId}/badges`, {
    method: 'GET',
  });

  return response.map((badge, index) => normalizeBadge(badge, index));
}
