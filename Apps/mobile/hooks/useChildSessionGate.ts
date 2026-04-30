import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { AppState } from 'react-native';

import { getChildProfile } from '@/services/childService';
import type { DaySchedule, WeekSchedule, WeekdayKey } from '@/types/child';

const WEEKDAY_KEYS: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WEEKDAY_PART_TO_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const WEEKDAY_REFERENCE_DATES = [
  new Date(2024, 0, 1),
  new Date(2024, 0, 2),
  new Date(2024, 0, 3),
  new Date(2024, 0, 4),
  new Date(2024, 0, 5),
  new Date(2024, 0, 6),
  new Date(2024, 0, 7),
];

const SESSION_GATE_REFRESH_MS = 30_000;

interface NextSessionStart {
  weekdayIndex: number;
  offsetDays: number;
  startMinutes: number;
}

interface ComputedGateState {
  isSessionActive: boolean;
  nextSessionStart: NextSessionStart | null;
}

interface SessionGateState extends ComputedGateState {
  weekSchedule: WeekSchedule | null;
  isLoading: boolean;
  hasError: boolean;
}

type SessionGateAction =
  | { type: 'loading' }
  | { type: 'loaded'; weekSchedule: WeekSchedule | null; now: Date; timeZone?: string }
  | { type: 'failed' }
  | { type: 'evaluate'; now: Date; timeZone?: string };

interface UseChildSessionGateOptions {
  weekSchedule?: WeekSchedule | null;
  minutesRemaining?: number | null;
  timeZone?: string | null;
  refreshIntervalMs?: number;
}

interface UseChildSessionGateResult {
  isSessionActive: boolean;
  nextSessionStartLabel: string | null;
  nextSessionTimeLabel: string | null;
  isDailyLimitReached: boolean;
  isLoading: boolean;
  hasError: boolean;
}

function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return hours * 60 + minutes;
}

function resolveDayWindow(day: DaySchedule | undefined): { start: number; end: number } | null {
  if (!day || !day.enabled) {
    return null;
  }

  const startMinutes = parseClockToMinutes(day.startTime);
  if (startMinutes === null) {
    return null;
  }

  const explicitEndMinutes = parseClockToMinutes(day.endTime);
  const fallbackEndMinutes =
    typeof day.durationMinutes === 'number' && day.durationMinutes > 0
      ? startMinutes + day.durationMinutes
      : null;
  const endMinutes = explicitEndMinutes ?? fallbackEndMinutes;

  if (endMinutes === null || endMinutes <= startMinutes || endMinutes > 24 * 60) {
    return null;
  }

  return {
    start: startMinutes,
    end: endMinutes,
  };
}

function getWeekdayIndexFromDate(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getNowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizeTimeZone(timeZone: string | null | undefined): string | undefined {
  const normalized = timeZone?.trim();
  if (!normalized) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: normalized }).format(new Date());
    return normalized;
  } catch {
    return undefined;
  }
}

function getClockSnapshot(now: Date, timeZone: string | undefined): { weekdayIndex: number; minutes: number } {
  if (!timeZone) {
    return {
      weekdayIndex: getWeekdayIndexFromDate(now),
      minutes: getNowMinutes(now),
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

    const weekday = parts.find((part) => part.type === 'weekday')?.value;
    const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '', 10);
    const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '', 10);
    const weekdayIndex = weekday ? WEEKDAY_PART_TO_INDEX[weekday] : undefined;

    if (weekdayIndex === undefined || Number.isNaN(hour) || Number.isNaN(minute)) {
      return {
        weekdayIndex: getWeekdayIndexFromDate(now),
        minutes: getNowMinutes(now),
      };
    }

    return {
      weekdayIndex,
      minutes: hour * 60 + minute,
    };
  } catch {
    return {
      weekdayIndex: getWeekdayIndexFromDate(now),
      minutes: getNowMinutes(now),
    };
  }
}

function computeGateState(
  weekSchedule: WeekSchedule | null | undefined,
  now: Date,
  timeZone: string | undefined,
): ComputedGateState {
  if (!weekSchedule) {
    return {
      isSessionActive: false,
      nextSessionStart: null,
    };
  }

  const snapshot = getClockSnapshot(now, timeZone);
  const currentDayKey = WEEKDAY_KEYS[snapshot.weekdayIndex];
  const currentWindow = resolveDayWindow(weekSchedule[currentDayKey]);

  const isSessionActive = Boolean(
    currentWindow && snapshot.minutes >= currentWindow.start && snapshot.minutes < currentWindow.end,
  );

  let nextSessionStart: NextSessionStart | null = null;

  for (let offset = 0; offset < 7; offset += 1) {
    const weekdayIndex = (snapshot.weekdayIndex + offset) % 7;
    const dayKey = WEEKDAY_KEYS[weekdayIndex];
    const window = resolveDayWindow(weekSchedule[dayKey]);

    if (!window) {
      continue;
    }

    if (offset === 0 && snapshot.minutes >= window.start) {
      continue;
    }

    nextSessionStart = {
      weekdayIndex,
      offsetDays: offset,
      startMinutes: window.start,
    };
    break;
  }

  return {
    isSessionActive,
    nextSessionStart,
  };
}

function sessionGateReducer(state: SessionGateState, action: SessionGateAction): SessionGateState {
  switch (action.type) {
    case 'loading':
      return {
        ...state,
        isLoading: true,
        hasError: false,
      };
    case 'loaded':
      return {
        ...computeGateState(action.weekSchedule, action.now, action.timeZone),
        weekSchedule: action.weekSchedule,
        isLoading: false,
        hasError: false,
      };
    case 'failed':
      return {
        ...computeGateState(null, new Date(), undefined),
        weekSchedule: null,
        isLoading: false,
        hasError: true,
      };
    case 'evaluate':
      if (state.isLoading) {
        return state;
      }

      return {
        ...state,
        ...computeGateState(state.weekSchedule, action.now, action.timeZone),
      };
    default:
      return state;
  }
}

function formatClockFromMinutes(minutes: number): string {
  const referenceDate = new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(referenceDate);
}

function formatWeekday(weekdayIndex: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
  }).format(WEEKDAY_REFERENCE_DATES[weekdayIndex]);
}

function formatNextSessionStart(nextSessionStart: NextSessionStart | null): string | null {
  if (!nextSessionStart) {
    return null;
  }

  const timeLabel = formatClockFromMinutes(nextSessionStart.startMinutes);

  if (nextSessionStart.offsetDays === 0) {
    return timeLabel;
  }

  return `${formatWeekday(nextSessionStart.weekdayIndex)} ${timeLabel}`;
}

export function useChildSessionGate(
  childId: string | null | undefined,
  options: UseChildSessionGateOptions = {},
): UseChildSessionGateResult {
  const normalizedChildId = childId?.trim() ?? '';
  const normalizedTimeZone = useMemo(() => normalizeTimeZone(options.timeZone), [options.timeZone]);
  const hasProvidedWeekSchedule = Object.prototype.hasOwnProperty.call(options, 'weekSchedule');
  const providedWeekSchedule = options.weekSchedule ?? null;
  const refreshIntervalMs = options.refreshIntervalMs ?? SESSION_GATE_REFRESH_MS;

  const [state, dispatch] = useReducer(
    sessionGateReducer,
    null,
    (): SessionGateState => {
      const initialWeekSchedule = hasProvidedWeekSchedule ? providedWeekSchedule : null;

      return {
        ...computeGateState(initialWeekSchedule, new Date(), normalizedTimeZone),
        weekSchedule: initialWeekSchedule,
        isLoading: !hasProvidedWeekSchedule,
        hasError: false,
      };
    },
  );

  const hydrate = useCallback(async () => {
    if (hasProvidedWeekSchedule) {
      return;
    }

    if (!normalizedChildId) {
      dispatch({
        type: 'loaded',
        weekSchedule: null,
        now: new Date(),
        timeZone: normalizedTimeZone,
      });
      return;
    }

    dispatch({ type: 'loading' });

    try {
      const profile = await getChildProfile(normalizedChildId);
      dispatch({
        type: 'loaded',
        weekSchedule: profile.rules?.weekSchedule ?? null,
        now: new Date(),
        timeZone: normalizedTimeZone,
      });
    } catch {
      dispatch({ type: 'failed' });
    }
  }, [hasProvidedWeekSchedule, normalizedChildId, normalizedTimeZone]);

  useEffect(() => {
    if (hasProvidedWeekSchedule) {
      dispatch({
        type: 'loaded',
        weekSchedule: providedWeekSchedule,
        now: new Date(),
        timeZone: normalizedTimeZone,
      });
      return;
    }

    void hydrate();
  }, [hasProvidedWeekSchedule, hydrate, normalizedTimeZone, providedWeekSchedule]);

  useEffect(() => {
    const evaluate = () => {
      dispatch({
        type: 'evaluate',
        now: new Date(),
        timeZone: normalizedTimeZone,
      });
    };

    evaluate();
    const intervalId = setInterval(evaluate, refreshIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [normalizedTimeZone, refreshIntervalMs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      dispatch({
        type: 'evaluate',
        now: new Date(),
        timeZone: normalizedTimeZone,
      });

      if (!hasProvidedWeekSchedule) {
        void hydrate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasProvidedWeekSchedule, hydrate, normalizedTimeZone]);

  return useMemo(() => {
    const isDailyLimitReached =
      typeof options.minutesRemaining === 'number' && options.minutesRemaining <= 0;
    const nextSessionStartLabel = formatNextSessionStart(state.nextSessionStart);

    return {
      isSessionActive: state.isSessionActive && !isDailyLimitReached,
      nextSessionStartLabel,
      nextSessionTimeLabel: nextSessionStartLabel,
      isDailyLimitReached,
      isLoading: state.isLoading,
      hasError: state.hasError,
    };
  }, [
    options.minutesRemaining,
    state.hasError,
    state.isLoading,
    state.isSessionActive,
    state.nextSessionStart,
  ]);
}
