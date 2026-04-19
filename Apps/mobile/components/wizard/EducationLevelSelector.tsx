import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { EducationLevel } from '@/types/child';
import {
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_LEVEL_ORDER,
} from '@/src/utils/childProfileWizard';

export type EducationMismatchType = 'under-standard' | 'accelerated' | null;

export interface EducationLevelSelectorState {
  value: EducationLevel | null;
  isConfirmed: boolean;
  mismatchType: EducationMismatchType;
}

interface EducationLevelSelectorProps {
  value: EducationLevel | null;
  onChange: (nextValue: EducationLevel) => void;
  derivedFromDOB: EducationLevel | null;
  isConfirmed: boolean;
  onConfirmedChange: (nextValue: boolean) => void;
  error?: string;
}

function getMismatchType(
  selected: EducationLevel | null,
  derived: EducationLevel | null,
): EducationMismatchType {
  if (!selected || !derived || selected === derived) {
    return null;
  }

  return EDUCATION_LEVEL_ORDER[selected] < EDUCATION_LEVEL_ORDER[derived]
    ? 'under-standard'
    : 'accelerated';
}

export function EducationLevelSelector({
  value,
  onChange,
  derivedFromDOB,
  isConfirmed,
  onConfirmedChange,
  error,
}: EducationLevelSelectorProps) {
  const mismatchType = getMismatchType(value, derivedFromDOB);
  const mismatchExists = mismatchType !== null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.groupLabel}>Education Level</Text>
      <View style={styles.pillRow}>
        {EDUCATION_LEVEL_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${option.label}, age ${option.ageRange}`}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value);
                if (mismatchExists) {
                  onConfirmedChange(false);
                }
              }}
              style={({ pressed }) => [
                styles.pill,
                selected ? styles.pillSelected : null,
                pressed ? styles.pillPressed : null,
              ]}
            >
              <Text style={[styles.pillTitle, selected ? styles.pillTitleSelected : null]}>{option.label}</Text>
              <Text style={[styles.pillSubtitle, selected ? styles.pillSubtitleSelected : null]}>
                Ages {option.ageRange}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mismatchType === 'under-standard' ? (
        <View style={styles.mismatchCard}>
          <Text style={styles.mismatchText}>
            You have selected a level below the standard for this age group. By confirming, you acknowledge that your
            child has specific learning needs or difficulties.
          </Text>
        </View>
      ) : null}

      {mismatchType === 'accelerated' ? (
        <View style={styles.mismatchCard}>
          <Text style={styles.mismatchText}>
            You have selected a level above the standard for this age group. By confirming, you acknowledge that your
            child is in an accelerated or advanced learning program.
          </Text>
        </View>
      ) : null}

      {mismatchExists ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Confirm education-level override"
          accessibilityState={{ checked: isConfirmed }}
          onPress={() => onConfirmedChange(!isConfirmed)}
          style={({ pressed }) => [styles.confirmRow, pressed ? styles.confirmRowPressed : null]}
        >
          <View style={[styles.checkbox, isConfirmed ? styles.checkboxChecked : null]}>
            {isConfirmed ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <Text style={styles.confirmText}>I confirm this education-level override.</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  groupLabel: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    flexGrow: 1,
    minWidth: 96,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pillPressed: {
    transform: [{ scale: 0.98 }],
  },
  pillTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  pillTitleSelected: {
    color: Colors.white,
  },
  pillSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  pillSubtitleSelected: {
    color: Colors.white,
  },
  mismatchCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.sm,
  },
  mismatchText: {
    ...Typography.caption,
    color: Colors.text,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  confirmRowPressed: {
    transform: [{ scale: 0.98 }],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxTick: {
    ...Typography.captionMedium,
    color: Colors.white,
  },
  confirmText: {
    ...Typography.caption,
    color: Colors.text,
    flex: 1,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
});
