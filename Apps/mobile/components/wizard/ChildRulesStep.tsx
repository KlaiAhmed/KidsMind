import { useFormContext, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LabeledToggleRow } from '@/components/ui/LabeledToggleRow';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { ChildProfileWizardFormValues } from '@/src/schemas/childProfileWizardSchema';
import {
  CONTENT_SAFETY_OPTIONS,
  LANGUAGE_OPTIONS,
  SUBJECT_OPTIONS,
  WEEKDAY_OPTIONS,
} from '@/src/utils/childProfileWizard';
import type { SubjectKey } from '@/types/child';

export function ChildRulesStep() {
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext<ChildProfileWizardFormValues>();

  const defaultLanguage = useWatch({ control, name: 'rules.defaultLanguage' });
  const blockedSubjects = useWatch({ control, name: 'rules.blockedSubjects' });
  const homeworkModeEnabled = useWatch({ control, name: 'rules.homeworkModeEnabled' });
  const voiceModeEnabled = useWatch({ control, name: 'rules.voiceModeEnabled' });
  const audioStorageEnabled = useWatch({ control, name: 'rules.audioStorageEnabled' });
  const conversationHistoryEnabled = useWatch({ control, name: 'rules.conversationHistoryEnabled' });
  const contentSafetyLevel = useWatch({ control, name: 'rules.contentSafetyLevel' });
  const timeWindowStart = useWatch({ control, name: 'rules.timeWindowStart' });
  const timeWindowEnd = useWatch({ control, name: 'rules.timeWindowEnd' });

  const allowedSubjects = useWatch({ control, name: 'schedule.allowedSubjects' });
  const weekSchedule = useWatch({ control, name: 'schedule.weekSchedule' });

  function toggleAllowedSubject(subject: SubjectKey) {
    const exists = allowedSubjects.includes(subject);
    const nextAllowedSubjects = exists
      ? allowedSubjects.filter((entry) => entry !== subject)
      : [...allowedSubjects, subject];

    setValue('schedule.allowedSubjects', nextAllowedSubjects, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (blockedSubjects.includes(subject)) {
      setValue(
        'rules.blockedSubjects',
        blockedSubjects.filter((entry) => entry !== subject),
        { shouldDirty: true, shouldValidate: true },
      );
    }

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

  function toggleBlockedSubject(subject: SubjectKey) {
    const isBlocked = blockedSubjects.includes(subject);
    const nextBlocked = isBlocked
      ? blockedSubjects.filter((entry) => entry !== subject)
      : [...blockedSubjects, subject];

    setValue('rules.blockedSubjects', nextBlocked, { shouldDirty: true, shouldValidate: true });

    if (!isBlocked && allowedSubjects.includes(subject)) {
      const nextAllowed = allowedSubjects.filter((entry) => entry !== subject);
      setValue('schedule.allowedSubjects', nextAllowed, {
        shouldDirty: true,
        shouldValidate: true,
      });

      for (const weekday of WEEKDAY_OPTIONS) {
        const currentSubjects = weekSchedule[weekday.key].subjects;
        const filteredSubjects = currentSubjects.filter((entry) => nextAllowed.includes(entry));

        if (filteredSubjects.length !== currentSubjects.length) {
          setValue(`schedule.weekSchedule.${weekday.key}.subjects` as any, filteredSubjects, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Child Rules</Text>
      <Text style={styles.subtitle}>Set language, safety, and usage controls.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Language</Text>
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.value === defaultLanguage;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Set default language to ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setValue('rules.defaultLanguage', option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                style={({ pressed }) => [
                  styles.languageChip,
                  selected ? styles.languageChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.languageChipText, selected ? styles.chipTextSelected : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.rules?.defaultLanguage?.message ? (
          <Text style={styles.errorText}>{errors.rules.defaultLanguage.message}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allowed Subjects</Text>
        <Text style={styles.sectionSubtitle}>Subjects the child can study in recommendations and schedule.</Text>
        <View style={styles.chipRow}>
          {SUBJECT_OPTIONS.map((subject) => {
            const selected = allowedSubjects.includes(subject.value);
            return (
              <Pressable
                key={`allowed-${subject.value}`}
                accessibilityRole="button"
                accessibilityLabel={`Toggle allowed subject ${subject.label}`}
                accessibilityState={{ selected }}
                onPress={() => toggleAllowedSubject(subject.value)}
                style={({ pressed }) => [
                  styles.subjectChip,
                  selected ? styles.allowedChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.subjectChipText, selected ? styles.chipTextSelected : null]}>
                  {subject.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked Subjects</Text>
        <Text style={styles.sectionSubtitle}>Blocked subjects are hidden from the child.</Text>
        <View style={styles.chipRow}>
          {SUBJECT_OPTIONS.map((subject) => {
            const selected = blockedSubjects.includes(subject.value);
            return (
              <Pressable
                key={`blocked-${subject.value}`}
                accessibilityRole="button"
                accessibilityLabel={`Toggle blocked subject ${subject.label}`}
                accessibilityState={{ selected }}
                onPress={() => toggleBlockedSubject(subject.value)}
                style={({ pressed }) => [
                  styles.subjectChip,
                  selected ? styles.blockedChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.subjectChipText, selected ? styles.chipTextSelected : null]}>
                  {subject.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.rules?.blockedSubjects?.message ? (
          <Text style={styles.errorText}>{errors.rules.blockedSubjects.message}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Safety</Text>
        <View style={styles.chipRow}>
          {CONTENT_SAFETY_OPTIONS.map((option) => {
            const selected = contentSafetyLevel === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Set content safety to ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setValue('rules.contentSafetyLevel', option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                style={({ pressed }) => [
                  styles.safetyChip,
                  selected ? styles.safetyChipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.safetyChipText, selected ? styles.chipTextSelected : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Time Window (HH:mm)</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>Start</Text>
            <TextInput
              value={timeWindowStart}
              onChangeText={(nextValue) => {
                setValue('rules.timeWindowStart', nextValue, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              placeholder="08:00"
              keyboardType="numbers-and-punctuation"
              style={styles.timeInput}
              accessibilityLabel="Session start time"
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>End</Text>
            <TextInput
              value={timeWindowEnd}
              onChangeText={(nextValue) => {
                setValue('rules.timeWindowEnd', nextValue, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              placeholder="21:00"
              keyboardType="numbers-and-punctuation"
              style={styles.timeInput}
              accessibilityLabel="Session end time"
            />
          </View>
        </View>
        {errors.rules?.timeWindowStart?.message ? (
          <Text style={styles.errorText}>{errors.rules.timeWindowStart.message}</Text>
        ) : null}
        {errors.rules?.timeWindowEnd?.message ? (
          <Text style={styles.errorText}>{errors.rules.timeWindowEnd.message}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <LabeledToggleRow
          label="Homework Mode"
          description="Prioritize school-style tasks and structured exercises."
          value={homeworkModeEnabled}
          onValueChange={(nextValue) => {
            setValue('rules.homeworkModeEnabled', nextValue, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          accessibilityLabel="Toggle homework mode"
        />
        <LabeledToggleRow
          label="Voice Mode"
          description="Allow voice interactions with the assistant."
          value={voiceModeEnabled}
          onValueChange={(nextValue) => {
            setValue('rules.voiceModeEnabled', nextValue, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          accessibilityLabel="Toggle voice mode"
        />
        <LabeledToggleRow
          label="Audio Storage"
          description="Store voice recordings for review and diagnostics."
          value={audioStorageEnabled}
          onValueChange={(nextValue) => {
            setValue('rules.audioStorageEnabled', nextValue, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          accessibilityLabel="Toggle audio storage"
        />
        <LabeledToggleRow
          label="Conversation History"
          description="Keep previous chat messages to improve continuity."
          value={conversationHistoryEnabled}
          onValueChange={(nextValue) => {
            setValue('rules.conversationHistoryEnabled', nextValue, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          accessibilityLabel="Toggle conversation history"
        />
      </View>
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
  languageChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  languageChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  languageChipText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  subjectChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  allowedChipSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
  },
  blockedChipSelected: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  subjectChipText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  safetyChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  safetyChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  safetyChipText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeField: {
    flex: 1,
    gap: Spacing.xs,
  },
  timeLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  timeInput: {
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
