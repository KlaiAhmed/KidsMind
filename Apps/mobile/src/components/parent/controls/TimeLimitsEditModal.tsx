import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod/v4';

import { Colors, Gradients, Radii, Shadows, Sizing, Spacing, Typography } from '@/constants/theme';
import { toApiErrorMessage, useAuth } from '@/contexts/AuthContext';
import { pauseChild, resumeChild, updateChildRules } from '@/services/childService';
import {
  deriveTimeWindowFromWeekSchedule,
  parseTimeToMinutes,
} from '@/src/utils/childProfileWizard';
import type { ChildProfile, WeekSchedule, WeekdayKey } from '@/types/child';

const DAILY_ALLOWANCE_OPTIONS = [30, 45, 60, 90, 120, 150, 180];
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
  dailyLimitMinutes: z.number().int().min(30).max(180).nullable(),
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

function minutesToLabel(totalMinutes: number | null | undefined): string {
  if (typeof totalMinutes !== 'number' || totalMinutes <= 0) {
    return 'Not set';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatMinutesToTime(value: number): string {
  const clamped = Math.max(0, Math.min(value, 23 * 60 + 30));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function formatClockLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Flexible';
  }

  const minutes = parseTimeToMinutes(value);
  if (minutes === null) {
    return value;
  }

  const hours = Math.floor(minutes / 60);
  const clockMinutes = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${`${clockMinutes}`.padStart(2, '0')} ${period}`;
}

function timeToOffset(value: string | null | undefined): number {
  const minutes = value ? parseTimeToMinutes(value) : null;
  if (minutes === null) {
    return 0;
  }

  return minutes / (24 * 60);
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

  return {
    dailyLimitMinutes: child.rules?.dailyLimitMinutes ?? child.dailyGoalMinutes ?? 60,
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

function SteppedSlider({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (nextValue: number) => void;
}) {
  const activeIndex = Math.max(0, DAILY_ALLOWANCE_OPTIONS.findIndex((option) => option === value));
  const fillPercent = DAILY_ALLOWANCE_OPTIONS.length > 1
    ? activeIndex / (DAILY_ALLOWANCE_OPTIONS.length - 1)
    : 0;

  return (
    <View style={[styles.sliderContainer, disabled ? styles.disabled : null]}>
      <View style={styles.sliderTrackBase} />
      <View style={[styles.sliderFill, { width: `${fillPercent * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${fillPercent * 100}%` }]} />
      <View style={styles.sliderTapTargets}>
        {DAILY_ALLOWANCE_OPTIONS.map((option, index) => (
          <Pressable
            key={option}
            accessibilityRole="adjustable"
            accessibilityLabel={`Set allowance to ${minutesToLabel(option)}`}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={({ pressed }) => [styles.sliderTapTarget, pressed ? styles.pressed : null]}
          >
            <View style={[styles.sliderDot, index <= activeIndex ? styles.sliderDotActive : null]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ErrorCard({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={styles.errorCard}>
      <MaterialCommunityIcons color={Colors.errorText} name="alert-circle-outline" size={18} />
      <Text style={styles.errorCardText}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={onDismiss}>
        <MaterialCommunityIcons color={Colors.errorText} name="close" size={18} />
      </Pressable>
    </View>
  );
}

export function TimeLimitsEditModal({ visible, child, onClose }: TimeLimitsEditModalProps) {
  const queryClient = useQueryClient();
  const { updateChildProfile } = useAuth();
  const [modalError, setModalError] = useState<string | null>(null);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [optimisticPauseValue, setOptimisticPauseValue] = useState<boolean | null>(null);

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
  const selectedDailyLimit = dailyLimitMinutes ?? 60;
  const isPaused = optimisticPauseValue ?? child.isPaused;

  useEffect(() => {
    if (visible) {
      reset(buildDefaultValues(child));
      setModalError(null);
      setPauseError(null);
      setOptimisticPauseValue(null);
    }
  }, [child, reset, visible]);

  const saveMutation = useMutation({
    mutationFn: async (values: TimeLimitsFormValues) => {
      const window = values.weekSchedule
        ? deriveTimeWindowFromWeekSchedule(values.weekSchedule)
        : { timeWindowStart: null, timeWindowEnd: null };

      return updateChildRules(child.id, {
        dailyLimitMinutes: values.dailyLimitMinutes,
        timeWindowStart: window.timeWindowStart,
        timeWindowEnd: window.timeWindowEnd,
        weekSchedule: values.weekSchedule,
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

  function handleWindowNudge(boundary: 'start' | 'end', deltaMinutes: number) {
    const currentSchedule = getValues('weekSchedule');
    if (!hasEnabledSchedule(currentSchedule)) {
      return;
    }

    const window = deriveTimeWindowFromWeekSchedule(currentSchedule);
    const currentStart = parseTimeToMinutes(window.timeWindowStart ?? '08:00') ?? 8 * 60;
    const currentEnd = parseTimeToMinutes(window.timeWindowEnd ?? '21:00') ?? 21 * 60;
    const minimumDuration = 30;
    const nextStart = boundary === 'start'
      ? Math.max(0, Math.min(currentStart + deltaMinutes, currentEnd - minimumDuration))
      : currentStart;
    const nextEnd = boundary === 'end'
      ? Math.min(23 * 60 + 30, Math.max(currentEnd + deltaMinutes, currentStart + minimumDuration))
      : currentEnd;
    const nextStartTime = formatMinutesToTime(nextStart);
    const nextEndTime = formatMinutesToTime(nextEnd);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel time limit edits"
            disabled={isBusy}
            onPress={onClose}
            style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
          >
            <Text style={styles.headerActionText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Time Limits</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {modalError ? <ErrorCard message={modalError} onDismiss={() => setModalError(null)} /> : null}

          <View pointerEvents={saveMutation.isPending ? 'none' : 'auto'} style={styles.formStack}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Daily Allowance</Text>
              <Text style={styles.valueTitle}>{minutesToLabel(selectedDailyLimit)}</Text>
              <Controller
                control={control}
                name="dailyLimitMinutes"
                render={({ field: { value } }) => (
                  <SteppedSlider
                    disabled={isBusy}
                    onChange={handleDailyLimitChange}
                    value={value ?? 60}
                  />
                )}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Active Window</Text>
              {hasScheduleConfigured ? (
                <>
                  <View style={styles.windowTrack}>
                    <View style={styles.windowTrackBase} />
                    {activeWindow.timeWindowStart && activeWindow.timeWindowEnd ? (
                      <View
                        style={[
                          styles.windowHighlight,
                          {
                            left: `${timeToOffset(activeWindow.timeWindowStart) * 100}%`,
                            width: `${Math.max(
                              (timeToOffset(activeWindow.timeWindowEnd)
                                - timeToOffset(activeWindow.timeWindowStart)) * 100,
                              8,
                            )}%`,
                          },
                        ]}
                      />
                    ) : null}
                    <Text style={styles.windowLabel}>
                      {`${formatClockLabel(activeWindow.timeWindowStart)} - ${formatClockLabel(activeWindow.timeWindowEnd)}`}
                    </Text>
                  </View>

                  <View style={styles.windowControls}>
                    <View style={styles.windowControlGroup}>
                      <Text style={styles.windowControlLabel}>Start</Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Move start earlier"
                          disabled={isBusy}
                          onPress={() => handleWindowNudge('start', -30)}
                          style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}
                        >
                          <MaterialCommunityIcons color={Colors.primary} name="minus" size={18} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Move start later"
                          disabled={isBusy}
                          onPress={() => handleWindowNudge('start', 30)}
                          style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}
                        >
                          <MaterialCommunityIcons color={Colors.primary} name="plus" size={18} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.windowControlGroup}>
                      <Text style={styles.windowControlLabel}>End</Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Move end earlier"
                          disabled={isBusy}
                          onPress={() => handleWindowNudge('end', -30)}
                          style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}
                        >
                          <MaterialCommunityIcons color={Colors.primary} name="minus" size={18} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Move end later"
                          disabled={isBusy}
                          onPress={() => handleWindowNudge('end', 30)}
                          style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}
                        >
                          <MaterialCommunityIcons color={Colors.primary} name="plus" size={18} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </>
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
              {pauseError ? <Text style={styles.inlineErrorText}>{pauseError}</Text> : null}
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
  headerAction: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionText: {
    ...Typography.label,
    color: Colors.primary,
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
  sliderContainer: {
    height: 34,
    justifyContent: 'center',
  },
  sliderTrackBase: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLowest,
    transform: [{ translateX: -11 }],
  },
  sliderTapTargets: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderTapTarget: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  sliderDotActive: {
    backgroundColor: Colors.primaryFixed,
  },
  windowTrack: {
    height: 48,
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  windowTrackBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  windowHighlight: {
    position: 'absolute',
    top: 20,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  windowLabel: {
    ...Typography.captionMedium,
    color: Colors.text,
    textAlign: 'center',
  },
  windowControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  windowControlGroup: {
    flex: 1,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  windowControlLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepperButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
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
