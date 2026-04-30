import type { AccessWindowSlot } from '@/types/child';

const DAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONDAY_FIRST_KEYS: readonly string[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WEEKDAY_SHORT_TO_JS_DAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_REFERENCE_DATES: readonly Date[] = [
  new Date(2024, 0, 7),
  new Date(2024, 0, 1),
  new Date(2024, 0, 2),
  new Date(2024, 0, 3),
  new Date(2024, 0, 4),
  new Date(2024, 0, 5),
  new Date(2024, 0, 6),
];

export function normalizeTimeZone(timeZone: string | null | undefined): string | undefined {
  const trimmed = timeZone?.trim();
  if (!trimmed) return undefined;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return undefined;
  }
}

export function getNowInTimezone(timeZone: string | undefined): Date {
  return new Date();
}

export function getClockSnapshot(
  now: Date,
  timeZone: string | undefined,
): { jsDayOfWeek: number; minutes: number } {
  if (!timeZone) {
    return {
      jsDayOfWeek: now.getDay(),
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === 'weekday')?.value;
    const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '', 10);
    const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '', 10);
    const jsDayOfWeek = weekday ? WEEKDAY_SHORT_TO_JS_DAY[weekday] : undefined;

    if (jsDayOfWeek === undefined || Number.isNaN(hour) || Number.isNaN(minute)) {
      return {
        jsDayOfWeek: now.getDay(),
        minutes: now.getHours() * 60 + now.getMinutes(),
      };
    }

    return { jsDayOfWeek, minutes: hour * 60 + minute };
  } catch {
    return {
      jsDayOfWeek: now.getDay(),
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }
}

export function jsDayToMondayFirstIndex(jsDayOfWeek: number): number {
  return jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
}

export function mondayFirstIndexToJsDay(index: number): number {
  return index === 6 ? 0 : index + 1;
}

export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function formatTime12h(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function formatDayName(jsDayOfWeek: number): string {
  if (jsDayOfWeek < 0 || jsDayOfWeek > 6) return '';
  return DAY_NAMES[jsDayOfWeek];
}

export function formatWeekdayFromMondayIndex(mondayFirstIndex: number): string {
  const jsDay = mondayFirstIndexToJsDay(mondayFirstIndex);
  return formatDayName(jsDay);
}

export function getWeekdayKeyForMondayIndex(mondayFirstIndex: number): string {
  return MONDAY_FIRST_KEYS[mondayFirstIndex] ?? 'monday';
}

export function findNextScheduledSlot(
  weekSchedule: Record<string, { enabled: boolean; startTime: string | null; endTime: string | null; durationMinutes: number | null }>,
  currentMondayFirstIndex: number,
  currentMinutes: number,
): { dayName: string; startTime12h: string; startMinutes: number; offsetDays: number; jsDayOfWeek: number } | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const mondayIndex = (currentMondayFirstIndex + offset) % 7;
    const dayKey = MONDAY_FIRST_KEYS[mondayIndex];
    const day = weekSchedule[dayKey];

    if (!day?.enabled) continue;

    const startMinutes = parseTimeToMinutes(day.startTime);
    if (startMinutes === null) continue;

    if (offset === 0 && currentMinutes >= startMinutes) continue;

    const jsDayOfWeek = mondayFirstIndexToJsDay(mondayIndex);
    const dayName = formatDayName(jsDayOfWeek);
    const startTime12h = formatTime12h(startMinutes);

    return { dayName, startTime12h, startMinutes, offsetDays: offset, jsDayOfWeek };
  }

  return null;
}

export function computeSecondsUntilStart(
  currentMinutes: number,
  currentJsDayOfWeek: number,
  targetStartMinutes: number,
  targetJsDayOfWeek: number,
): number {
  const currentTotalMinutes = currentJsDayOfWeek * 24 * 60 + currentMinutes;
  let targetTotalMinutes = targetJsDayOfWeek * 24 * 60 + targetStartMinutes;

  if (targetTotalMinutes <= currentTotalMinutes) {
    targetTotalMinutes += 7 * 24 * 60;
  }

  return (targetTotalMinutes - currentTotalMinutes) * 60;
}

export function buildAccessWindowSlots(
  weekSchedule: Record<string, { enabled: boolean; startTime: string | null; endTime: string | null; durationMinutes: number | null }>,
): AccessWindowSlot[] {
  const slots: AccessWindowSlot[] = [];

  for (let mondayIndex = 0; mondayIndex < 7; mondayIndex += 1) {
    const dayKey = MONDAY_FIRST_KEYS[mondayIndex];
    const day = weekSchedule[dayKey];

    if (!day?.enabled) continue;
    if (!day.startTime) continue;

    const startMinutes = parseTimeToMinutes(day.startTime);
    const explicitEndMinutes = parseTimeToMinutes(day.endTime);
    const fallbackEndMinutes =
      typeof day.durationMinutes === 'number' && day.durationMinutes > 0 && startMinutes !== null
        ? startMinutes + day.durationMinutes
        : null;
    const endMinutes = explicitEndMinutes ?? fallbackEndMinutes;

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue;

    const dailyCapSeconds =
      typeof day.durationMinutes === 'number' && day.durationMinutes > 0
        ? day.durationMinutes * 60
        : (endMinutes - startMinutes) * 60;

    slots.push({
      dayOfWeek: mondayIndex,
      startTime: day.startTime,
      endTime: formatTimeHHMM(endMinutes),
      dailyCapSeconds,
    });
  }

  return slots;
}

function formatTimeHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export { WEEKDAY_REFERENCE_DATES, MONDAY_FIRST_KEYS };
