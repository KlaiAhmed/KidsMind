import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import {
  DEFAULT_DAILY_ALLOWANCE_MINUTES,
  SteppedSlider,
  formatSteppedSliderValue,
} from '@/components/ui/SteppedSlider';
import { TimeRangeSlider } from '@/components/ui/TimeRangeSlider';
import { Colors, Gradients, Radii, Shadows, Sizing, Spacing, Typography } from '@/constants/theme';
import { toApiErrorMessage, useAuth } from '@/contexts/AuthContext';
import { pauseChild, resumeChild, updateChildRules } from '@/services/childService';
import { ErrorCard } from '@/src/components/parent/ParentDashboardStates';
import {
  deriveTimeWindowFromWeekSchedule,
  parseTimeToMinutes,
} from '@/src/utils/childProfileWizard';
import type { ChildProfile, WeekSchedule, WeekdayKey } from '@/types/child';

const WEEKDAY_KEYS: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const timeLimitsSchema = z.object({
  dailyLimitMinutes: z.number().int().min(30).max(600).nullable(),
  timeWindowStart: z.string().nullable(),
  timeWindowEnd: z.string().nullable(),
  weekSchedule: z.custom<WeekSchedule | null>(
    (value) => value === null || (typeof value === 'object' && value !== null),
    'Invalid weekly schedule',
  ),
});

type TimeLimitsFormValues = z.infer<typeof timeLimitsSchema>;

interface TimeLimitsEditModalProps {
  visible: boolean;
  child: ChildProfile;
  onClose: () => void;
}

function formatMinutesToTime(value: number): string {
  const clamped = Math.max(0, Math.min(value, 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function formatMinutesToApiTime(value: number): string {
  return `${formatMinutesToTime(value)}:00`;
}

function normalizeApiTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const minutes = parseTimeToMinutes(value);
  return minutes === null ? null : formatMinutesToApiTime(minutes);
}

function hasEnabledSchedule(weekSchedule: WeekSchedule | null | undefined): weekSchedule is WeekSchedule {
  if (!weekSchedule) {
    return false;
  }

  return WEEKDAY_KEYS.some((dayKey) => weekSchedule[dayKey].enabled);
}

function buildDefaultValues(child: ChildProfile): TimeLimitsFormValues {
  const weekSchedule = child.rules?.weekSchedule ?? null;
  const window = weekSchedule ? deriveTimeWindowFromWeekSchedule(weekSchedule) : {
    timeWindowStart: child.rules?.timeWindowStart ?? null,
    timeWindowEnd: child.rules?.timeWindowEnd ?? null,
  };

  const savedDailyLimit = child.rules?.dailyLimitMinutes ?? child.dailyGoalMinutes;
  const dailyLimitMinutes = typeof savedDailyLimit === 'number' && savedDailyLimit >= DEFAULT_DAILY_ALLOWANCE_MINUTES
    ? savedDailyLimit
    : DEFAULT_DAILY_ALLOWANCE_MINUTES;

  return {
    dailyLimitMinutes,
    timeWindowStart: window.timeWindowStart,
    timeWindowEnd: window.timeWindowEnd,
    weekSchedule,
  };
}

function applyDailyLimit(weekSchedule: WeekSchedule, dailyLimitMinutes: number): WeekSchedule {
  const nextSchedule = { ...weekSchedule };

  WEEKDAY_KEYS.forEach((dayKey) => {
    const day = nextSchedule[dayKey];
    nextSchedule[dayKey] = day.enabled
      ? { ...day, durationMinutes: dailyLimitMinutes }
      : { ...day };
  });

  return nextSchedule;
}

function applyActiveWindow(weekSchedule: WeekSchedule, startTime: string, endTime: string): WeekSchedule {
  const nextSchedule = { ...weekSchedule };

  WEEKDAY_KEYS.forEach((dayKey) => {
    const day = nextSchedule[dayKey];
    nextSchedule[dayKey] = day.enabled
      ? { ...day, startTime, endTime }
      : { ...day };
  });

  return nextSchedule;
}

export function TimeLimitsEditModal({ visible, child, onClose }: TimeLimitsEditModalProps) {
  const queryClient = useQueryClient();
  const { updateChildProfile } = useAuth();
  const [modalError, setModalError] = useState<string | null>(null);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [optimisticPauseValue, setOptimisticPauseValue] = useState<boolean | null>(null);
  const lastVisibleRef = useRef(false);
  const lastChildIdRef = useRef(child.id);

  const methods = useForm<TimeLimitsFormValues>({
    resolver: zodResolver(timeLimitsSchema),
    defaultValues: buildDefaultValues(child),
    mode: 'onChange',
  });

  const { control, getValues, handleSubmit, reset, setValue } = methods;
  const dailyLimitMinutes = useWatch({ control, name: 'dailyLimitMinutes' });
  const weekSchedule = useWatch({ control, name: 'weekSchedule' });
  const hasScheduleConfigured = hasEnabledSchedule(weekSchedule);
  const activeWindow = useMemo(
    () => hasScheduleConfigured
      ? deriveTimeWindowFromWeekSchedule(weekSchedule)
      : { timeWindowStart: null, timeWindowEnd: null },
    [hasScheduleConfigured, weekSchedule],
  );
  const selectedDailyLimit = dailyLimitMinutes ?? DEFAULT_DAILY_ALLOWANCE_MINUTES;
  const isPaused = optimisticPauseValue ?? child.isPaused;

  useEffect(() => {
    const childChanged = lastChildIdRef.current !== child.id;
    const opened = visible && !lastVisibleRef.current;

    if (visible && (opened || childChanged)) {
      reset(buildDefaultValues(child));
      setModalError(null);
      setPauseError(null);
      setOptimisticPauseValue(null);
    }

    lastVisibleRef.current = visible;
    if (childChanged) {
      lastChildIdRef.current = child.id;
    }
  }, [child, reset, visible]);

  const saveMutation = useMutation({
    mutationFn: async (values: TimeLimitsFormValues) => {
      const window = values.weekSchedule
        ? deriveTimeWindowFromWeekSchedule(values.weekSchedule)
        : { timeWindowStart: null, timeWindowEnd: null };
      const nextWeekSchedule = values.weekSchedule
        ? applyActiveWindow(
          values.weekSchedule,
          normalizeApiTime(window.timeWindowStart) ?? window.timeWindowStart ?? '08:00:00',
          normalizeApiTime(window.timeWindowEnd) ?? window.timeWindowEnd ?? '20:00:00',
        )
        : values.weekSchedule;

      return updateChildRules(child.id, {
        dailyLimitMinutes: values.dailyLimitMinutes,
        timeWindowStart: normalizeApiTime(window.timeWindowStart),
        timeWindowEnd: normalizeApiTime(window.timeWindowEnd),
        weekSchedule: nextWeekSchedule,
      });
    },
    onMutate: () => {
      setModalError(null);
    },
    onSuccess: async (nextProfile) => {
      const { id: _id, ...updates } = nextProfile;
      updateChildProfile(updates);
      await queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
      onClose();
    },
    onError: (error) => {
      setModalError(toApiErrorMessage(error));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (nextPaused: boolean) =>
      nextPaused ? pauseChild(child.id) : resumeChild(child.id),
    onMutate: (nextPaused) => {
      setPauseError(null);
      const previousPaused = optimisticPauseValue ?? child.isPaused;
      setOptimisticPauseValue(nextPaused);
      return { previousPaused };
    },
    onSuccess: async (result) => {
      updateChildProfile({ isPaused: result.isPaused });
      setOptimisticPauseValue(null);
      await queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
    },
    onError: (error, _nextPaused, context) => {
      setOptimisticPauseValue(context?.previousPaused ?? child.isPaused);
      setPauseError(toApiErrorMessage(error));
      setTimeout(() => setOptimisticPauseValue(null), 0);
    },
  });

  const isBusy = saveMutation.isPending || pauseMutation.isPending;

  function handleDailyLimitChange(nextValue: number) {
    setValue('dailyLimitMinutes', nextValue, { shouldDirty: true, shouldValidate: true });

    const currentSchedule = getValues('weekSchedule');
    if (hasEnabledSchedule(currentSchedule)) {
      setValue('weekSchedule', applyDailyLimit(currentSchedule, nextValue), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function handleWindowRangeChange(startMinutes: number, endMinutes: number) {
    const currentSchedule = getValues('weekSchedule');
    if (!hasEnabledSchedule(currentSchedule)) {
      return;
    }

    const nextStartTime = formatMinutesToApiTime(startMinutes);
    const nextEndTime = formatMinutesToApiTime(endMinutes);

    setValue('timeWindowStart', nextStartTime, { shouldDirty: true, shouldValidate: true });
    setValue('timeWindowEnd', nextEndTime, { shouldDirty: true, shouldValidate: true });
    setValue('weekSchedule', applyActiveWindow(currentSchedule, nextStartTime, nextEndTime), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Edit Time Limits</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {modalError ? (
            <ErrorCard
              message={modalError}
              onRetry={() => {
                setModalError(null);
                saveMutation.mutate(getValues());
              }}
              retryLabel="Try Again"
              title="Time limit update failed"
            />
          ) : null}

          <View pointerEvents={saveMutation.isPending ? 'none' : 'auto'} style={styles.formStack}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Daily Allowance</Text>
              <Controller
                control={control}
                name="dailyLimitMinutes"
                render={({ field: { value } }) => (
                  <View pointerEvents={isBusy ? 'none' : 'auto'} style={isBusy ? styles.disabled : null}>
                    <SteppedSlider onChange={handleDailyLimitChange} value={value ?? DEFAULT_DAILY_ALLOWANCE_MINUTES} />
                  </View>
                )}
              />
              <Text style={styles.valueTitle}>{formatSteppedSliderValue(selectedDailyLimit)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Active Window</Text>
              {hasScheduleConfigured ? (
                <View pointerEvents={isBusy ? 'none' : 'auto'} style={isBusy ? styles.disabled : null}>
                  <TimeRangeSlider
                    endMinutes={parseTimeToMinutes(activeWindow.timeWindowEnd ?? '20:00:00') ?? 20 * 60}
                    onChange={handleWindowRangeChange}
                    startMinutes={parseTimeToMinutes(activeWindow.timeWindowStart ?? '08:00:00') ?? 8 * 60}
                  />
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Set a weekly schedule in Edit Profile to configure time windows
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Pause access"
                accessibilityState={{ checked: isPaused, disabled: isBusy }}
                disabled={isBusy}
                onPress={() => pauseMutation.mutate(!isPaused)}
                style={({ pressed }) => [styles.pauseRow, pressed ? styles.pressed : null]}
              >
                <View style={styles.pauseCopy}>
                  <Text style={styles.pauseLabel}>Pause Access</Text>
                  <Text style={styles.pauseDescription}>
                    Temporarily block chat access while keeping learning data.
                  </Text>
                </View>
                {pauseMutation.isPending ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Switch
                    accessibilityLabel="Pause access toggle"
                    disabled={isBusy}
                    onValueChange={(nextValue) => pauseMutation.mutate(nextValue)}
                    thumbColor={Colors.white}
                    trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                    value={isPaused}
                  />
                )}
              </Pressable>
              {pauseError ? (
                <ErrorCard
                  message={pauseError}
                  onRetry={() => {
                    setPauseError(null);
                    const variables = pauseMutation.variables;
                    if (typeof variables === 'boolean') {
                      pauseMutation.mutate(variables);
                    }
                  }}
                  retryLabel="Try Again"
                  title="Pause update failed"
                />
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save time limit changes"
            disabled={isBusy}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            style={({ pressed }) => [styles.saveButton, isBusy ? styles.disabled : null, pressed ? styles.pressed : null]}
          >
            <LinearGradient
              colors={[...Gradients.indigoDepth.colors]}
              end={Gradients.indigoDepth.end}
              start={Gradients.indigoDepth.start}
              style={styles.saveGradient}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveLabel}>Save Changes</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel time limit changes"
            disabled={isBusy}
            onPress={onClose}
            style={({ pressed }) => [styles.cancelFooterButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cancelFooterText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  formStack: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  valueTitle: {
    ...Typography.title,
    color: Colors.primary,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  pauseRow: {
    minHeight: 64,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pauseCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  pauseLabel: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  pauseDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  saveButton: {
    minHeight: Sizing.buttonHeight,
    borderRadius: Radii.lg,
  },
  saveGradient: {
    minHeight: Sizing.buttonHeight,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    ...Typography.label,
    color: Colors.white,
  },
  cancelFooterButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFooterText: {
    ...Typography.bodySemiBold,
    color: Colors.textSecondary,
  },
  errorCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.errorContainer,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  errorCardText: {
    ...Typography.caption,
    color: Colors.errorText,
    flex: 1,
  },
  inlineErrorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
