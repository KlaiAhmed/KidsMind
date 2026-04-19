import { z } from 'zod/v4';
import type { ChildProfile, EducationLevel, SubjectKey, WeekSchedule } from '@/types/child';
import {
  backendStageToEducationLevel,
  buildDefaultWeekSchedule,
  parseTimeToMinutes,
  SUBJECT_OPTIONS,
} from '@/src/utils/childProfileWizard';

const educationLevelValues = ['kindergarten', 'primary_school', 'secondary_school'] as const;
const subjectValues = SUBJECT_OPTIONS.map((entry) => entry.value) as [
  SubjectKey,
  ...SubjectKey[],
];

const educationLevelSchema = z.enum(educationLevelValues);
const subjectSchema = z.enum(subjectValues);

const dayScheduleSchema = z.object({
  enabled: z.boolean(),
  subjects: z.array(subjectSchema),
  durationMinutes: z.number().int().positive().nullable(),
});

const weekScheduleSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

const childInfoSchema = z.object({
  nickname: z.string().trim().min(2, 'Child name must be at least 2 characters').max(64),
  dob: z.object({
    day: z.string(),
    month: z.string(),
    year: z.string(),
  }),
  birthDateIso: z.string().nullable(),
  educationLevel: educationLevelSchema.nullable(),
  derivedEducationLevel: educationLevelSchema.nullable(),
  mismatchAcknowledged: z.boolean(),
  educationManuallySet: z.boolean(),
});

const scheduleSchema = z
  .object({
    allowedSubjects: z.array(subjectSchema).min(1, 'Choose at least one subject'),
    dailyLimitMinutes: z.number().int().min(1, 'Daily limit must be at least 1 minute').max(600),
    weekSchedule: weekScheduleSchema,
  })
  .superRefine((value, ctx) => {
    const weekdays = Object.entries(value.weekSchedule) as [
      string,
      (typeof value.weekSchedule)[keyof typeof value.weekSchedule],
    ][];
    const enabledDays = weekdays.filter(([, day]) => day.enabled);

    if (enabledDays.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['weekSchedule'],
        message: 'Enable at least one day in the weekly schedule',
      });
      return;
    }

    for (const [dayKey, day] of enabledDays) {
      if (!day.durationMinutes || day.durationMinutes <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['weekSchedule', dayKey, 'durationMinutes'],
          message: 'Duration must be greater than 0 minutes',
        });
      }

      if (day.durationMinutes && day.durationMinutes > value.dailyLimitMinutes) {
        ctx.addIssue({
          code: 'custom',
          path: ['weekSchedule', dayKey, 'durationMinutes'],
          message: 'Duration cannot exceed the global daily limit',
        });
      }

      if (day.subjects.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['weekSchedule', dayKey, 'subjects'],
          message: 'Choose at least one subject for enabled days',
        });
      }

      const invalidSubjects = day.subjects.filter(
        (subject) => !value.allowedSubjects.includes(subject),
      );

      if (invalidSubjects.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['weekSchedule', dayKey, 'subjects'],
          message: 'Per-day subjects must come from the allowed subject list',
        });
      }
    }
  });

const rulesSchema = z
  .object({
    defaultLanguage: z.string().trim().min(2, 'Choose a default language'),
    blockedSubjects: z.array(subjectSchema),
    homeworkModeEnabled: z.boolean(),
    voiceModeEnabled: z.boolean(),
    audioStorageEnabled: z.boolean(),
    conversationHistoryEnabled: z.boolean(),
    contentSafetyLevel: z.enum(['strict', 'moderate']),
    timeWindowStart: z.string(),
    timeWindowEnd: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.timeWindowStart && parseTimeToMinutes(value.timeWindowStart) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeWindowStart'],
        message: 'Earliest session start must be in HH:MM format',
      });
    }

    if (value.timeWindowEnd && parseTimeToMinutes(value.timeWindowEnd) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeWindowEnd'],
        message: 'Latest session end must be in HH:MM format',
      });
    }

    if (!value.timeWindowStart || !value.timeWindowEnd) {
      return;
    }

    const start = parseTimeToMinutes(value.timeWindowStart);
    const end = parseTimeToMinutes(value.timeWindowEnd);

    if (start !== null && end !== null && end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeWindowEnd'],
        message: 'Latest session end must be later than earliest session start',
      });
    }
  });

export const childProfileWizardSchema = z
  .object({
    childInfo: childInfoSchema,
    avatar: z.object({
      avatarId: z.string().min(1, 'Choose an avatar'),
    }),
    schedule: scheduleSchema,
    rules: rulesSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.childInfo.birthDateIso) {
      ctx.addIssue({
        code: 'custom',
        path: ['childInfo', 'dob'],
        message: 'Enter a valid date of birth',
      });
    }

    if (!value.childInfo.educationLevel) {
      ctx.addIssue({
        code: 'custom',
        path: ['childInfo', 'educationLevel'],
        message: 'Choose an education level',
      });
    }

    if (
      value.childInfo.educationLevel &&
      value.childInfo.derivedEducationLevel &&
      value.childInfo.educationLevel !== value.childInfo.derivedEducationLevel &&
      !value.childInfo.mismatchAcknowledged
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['childInfo', 'mismatchAcknowledged'],
        message: 'Please confirm the education-level override to continue',
      });
    }

    const overlap = value.rules.blockedSubjects.filter((subject) =>
      value.schedule.allowedSubjects.includes(subject),
    );

    if (overlap.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['rules', 'blockedSubjects'],
        message: 'Blocked subjects cannot overlap with allowed subjects',
      });
    }
  });

export type ChildProfileWizardFormValues = z.infer<typeof childProfileWizardSchema>;

function extractDobParts(birthDate: string | undefined): { day: string; month: string; year: string } {
  if (!birthDate) {
    return { day: '', month: '', year: '' };
  }

  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { day: '', month: '', year: '' };
  }

  return {
    year: `${parseInt(match[1], 10)}`,
    month: `${parseInt(match[2], 10)}`,
    day: `${parseInt(match[3], 10)}`,
  };
}

function normalizeExistingWeekSchedule(
  weekSchedule: WeekSchedule | null | undefined,
  allowedSubjects: SubjectKey[],
): WeekSchedule {
  const fallback = buildDefaultWeekSchedule(allowedSubjects.length > 0 ? allowedSubjects : ['math']);

  if (!weekSchedule) {
    return fallback;
  }

  return {
    monday: weekSchedule.monday ?? fallback.monday,
    tuesday: weekSchedule.tuesday ?? fallback.tuesday,
    wednesday: weekSchedule.wednesday ?? fallback.wednesday,
    thursday: weekSchedule.thursday ?? fallback.thursday,
    friday: weekSchedule.friday ?? fallback.friday,
    saturday: weekSchedule.saturday ?? fallback.saturday,
    sunday: weekSchedule.sunday ?? fallback.sunday,
  };
}

export function buildChildProfileWizardDefaultValues(
  profile: ChildProfile | null,
  defaultAvatarId: string,
): ChildProfileWizardFormValues {
  const allowedSubjects = profile?.rules?.allowedSubjects?.length
    ? profile.rules.allowedSubjects
    : profile?.subjectIds?.length
      ? profile.subjectIds
      : ['math', 'reading'];

  const weekSchedule = normalizeExistingWeekSchedule(profile?.rules?.weekSchedule, allowedSubjects);
  const dob = extractDobParts(profile?.birthDate);

  return {
    childInfo: {
      nickname: profile?.nickname ?? profile?.name ?? '',
      dob,
      birthDateIso: profile?.birthDate ?? null,
      educationLevel: profile ? backendStageToEducationLevel(profile.educationStage) : null,
      derivedEducationLevel: null,
      mismatchAcknowledged: false,
      educationManuallySet: false,
    },
    avatar: {
      avatarId: profile?.avatarId ?? defaultAvatarId,
    },
    schedule: {
      allowedSubjects,
      dailyLimitMinutes: profile?.rules?.dailyLimitMinutes ?? profile?.dailyGoalMinutes ?? 30,
      weekSchedule,
    },
    rules: {
      defaultLanguage: profile?.rules?.defaultLanguage ?? profile?.languages?.[0] ?? 'en',
      blockedSubjects: profile?.rules?.blockedSubjects ?? [],
      homeworkModeEnabled: profile?.rules?.homeworkModeEnabled ?? false,
      voiceModeEnabled: profile?.rules?.voiceModeEnabled ?? true,
      audioStorageEnabled: profile?.rules?.audioStorageEnabled ?? false,
      conversationHistoryEnabled: profile?.rules?.conversationHistoryEnabled ?? true,
      contentSafetyLevel: profile?.rules?.contentSafetyLevel ?? 'moderate',
      timeWindowStart: profile?.rules?.timeWindowStart ?? '08:00',
      timeWindowEnd: profile?.rules?.timeWindowEnd ?? '21:00',
    },
  };
}

export function getMismatchType(
  selected: EducationLevel | null,
  derived: EducationLevel | null,
): 'under-standard' | 'accelerated' | null {
  if (!selected || !derived) {
    return null;
  }

  const order = {
    kindergarten: 0,
    primary_school: 1,
    secondary_school: 2,
  } as const;

  if (selected === derived) {
    return null;
  }

  return order[selected] < order[derived] ? 'under-standard' : 'accelerated';
}
