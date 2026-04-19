import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { ChildProfileWizardFormValues } from '@/src/schemas/childProfileWizardSchema';
import { SUBJECT_OPTIONS, WEEKDAY_OPTIONS } from '@/src/utils/childProfileWizard';
import type { SubjectKey, WeekdayKey } from '@/types/child';

function toMinuteLabel(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '';
  }

  return `${value}`;
}

export function WeekScheduleStep() {
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext<ChildProfileWizardFormValues>();

  const allowedSubjects = useWatch({ control, name: 'schedule.allowedSubjects' });
  const dailyLimitMinutes = useWatch({ control, name: 'schedule.dailyLimitMinutes' });
  const weekSchedule = useWatch({ control, name: 'schedule.weekSchedule' });

  const enabledDays = useMemo(
    () => WEEKDAY_OPTIONS.filter((day) => weekSchedule?.[day.key]?.enabled),
    [weekSchedule],
  );

  function toggleAllowedSubject(subject: SubjectKey) {
    const exists = allowedSubjects.includes(subject);
    const nextAllowedSubjects = exists
      ? allowedSubjects.filter((entry) => entry !== subject)
      : [...allowedSubjects, subject];

    setValue('schedule.allowedSubjects', nextAllowedSubjects, {
      shouldDirty: true,
      shouldValidate: true,
    });

    for (const weekday of WEEKDAY_OPTIONS) {
      const currentSubjects = weekSchedule[weekday.key].subjects;
      const filteredSubjects = currentSubjects.filter((entry) => nextAllowedSubjects.includes(entry));

      if (filteredSubjects.length !== currentSubjects.length) {
        setValue(`schedule.weekSchedule.${weekday.key}.subjects` as any, filteredSubjects, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }

  function toggleDay(day: WeekdayKey) {
    const nextEnabled = !weekSchedule[day].enabled;
    setValue(`schedule.weekSchedule.${day}.enabled` as any, nextEnabled, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!nextEnabled) {
      setValue(`schedule.weekSchedule.${day}.durationMinutes` as any, null, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    const nextSubjects = weekSchedule[day].subjects.filter((subject) => allowedSubjects.includes(subject));
    setValue(`schedule.weekSchedule.${day}.subjects` as any, nextSubjects, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!weekSchedule[day].durationMinutes) {
      setValue(`schedule.weekSchedule.${day}.durationMinutes` as any, Math.min(30, dailyLimitMinutes), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function toggleDaySubject(day: WeekdayKey, subject: SubjectKey) {
    const daySubjects = weekSchedule[day].subjects;
    const nextSubjects = daySubjects.includes(subject)
      ? daySubjects.filter((entry) => entry !== subject)
      : [...daySubjects, subject];

    setValue(`schedule.weekSchedule.${day}.subjects` as any, nextSubjects, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Week Schedule</Text>
      <Text style={styles.subtitle}>Set the subject list, daily cap, and day-by-day study plan.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject Master List</Text>
        <Text style={styles.sectionSubtitle}>These subjects are available for per-day assignment.</Text>
        <View style={styles.chipRow}>
          {SUBJECT_OPTIONS.map((subject) => {
            const selected = allowedSubjects.includes(subject.value);

            return (
              <Pressable
                key={subject.value}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${subject.label}`}
                accessibilityState={{ selected }}
                onPress={() => toggleAllowedSubject(subject.value)}
                style={({ pressed }) => [
                  styles.subjectChip,
                  selected ? styles.subjectChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.subjectChipText, selected ? styles.subjectChipTextSelected : null]}>
                  {subject.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.schedule?.allowedSubjects?.message ? (
          <Text style={styles.errorText}>{errors.schedule.allowedSubjects.message}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Daily Limit (minutes)</Text>
        <TextInput
          value={`${dailyLimitMinutes}`}
          onChangeText={(nextValue) => {
            const parsed = parseInt(nextValue.replace(/\D/g, ''), 10);
            setValue('schedule.dailyLimitMinutes', Number.isNaN(parsed) ? 0 : parsed, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
          style={styles.numericInput}
          accessibilityLabel="Global daily limit in minutes"
        />
        {errors.schedule?.dailyLimitMinutes?.message ? (
          <Text style={styles.errorText}>{errors.schedule.dailyLimitMinutes.message}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Days</Text>
        <View style={styles.chipRow}>
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = weekSchedule[day.key].enabled;

            return (
              <Pressable
                key={day.key}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${day.fullLabel}`}
                accessibilityState={{ selected }}
                onPress={() => toggleDay(day.key)}
                style={({ pressed }) => [
                  styles.dayChip,
                  selected ? styles.dayChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.dayChipText, selected ? styles.dayChipTextSelected : null]}>
                  {day.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {enabledDays.map((day) => {
        const dayState = weekSchedule[day.key];

        return (
          <View key={day.key} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{day.fullLabel}</Text>

            <Text style={styles.dayLabel}>Subjects for this day</Text>
            <View style={styles.chipRow}>
              {SUBJECT_OPTIONS.filter((subject) => allowedSubjects.includes(subject.value)).map((subject) => {
                const selected = dayState.subjects.includes(subject.value);

                return (
                  <Pressable
                    key={`${day.key}-${subject.value}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${subject.label} for ${day.fullLabel}`}
                    accessibilityState={{ selected }}
                    onPress={() => toggleDaySubject(day.key, subject.value)}
                    style={({ pressed }) => [
                      styles.subjectChip,
                      selected ? styles.subjectChipSelected : null,
                      pressed ? styles.chipPressed : null,
                    ]}
                  >
                    <Text style={[styles.subjectChipText, selected ? styles.subjectChipTextSelected : null]}>
                      {subject.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.dayLabel}>Duration (minutes)</Text>
            <TextInput
              value={toMinuteLabel(dayState.durationMinutes)}
              onChangeText={(nextValue) => {
                const parsed = parseInt(nextValue.replace(/\D/g, ''), 10);
                setValue(
                  `schedule.weekSchedule.${day.key}.durationMinutes` as any,
                  Number.isNaN(parsed) ? null : parsed,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={3}
              style={styles.numericInput}
              accessibilityLabel={`${day.fullLabel} duration in minutes`}
            />

            {errors.schedule?.weekSchedule?.[day.key]?.subjects?.message ? (
              <Text style={styles.errorText}>{errors.schedule.weekSchedule[day.key]?.subjects?.message}</Text>
            ) : null}
            {errors.schedule?.weekSchedule?.[day.key]?.durationMinutes?.message ? (
              <Text style={styles.errorText}>
                {errors.schedule.weekSchedule[day.key]?.durationMinutes?.message}
              </Text>
            ) : null}
          </View>
        );
      })}

      {errors.schedule?.weekSchedule?.message ? (
        <Text style={styles.errorText}>{errors.schedule.weekSchedule.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  title: {
    ...Typography.headline,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  subjectChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  subjectChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  subjectChipText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  subjectChipTextSelected: {
    color: Colors.white,
  },
  dayChip: {
    minWidth: 56,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  dayChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dayChipText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  dayChipTextSelected: {
    color: Colors.white,
  },
  dayCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dayTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  dayLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
    ...Typography.body,
    height: 44,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
});
