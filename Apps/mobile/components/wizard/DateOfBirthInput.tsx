import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { calculateAgeFromBirthDate } from '@/src/utils/childProfileWizard';

export interface DateOfBirthValue {
  day: string;
  month: string;
  year: string;
}

interface DateOfBirthInputProps {
  value: DateOfBirthValue;
  onChange: (nextValue: DateOfBirthValue) => void;
  onValidChange: (nextDate: Date | null) => void;
  externalError?: string;
}

interface DateValidationResult {
  dayError?: string;
  monthError?: string;
  yearError?: string;
  dateError?: string;
  validDate: Date | null;
}

function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function isValidDay(value: string): boolean {
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 31;
}

function isValidMonth(value: string): boolean {
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 12;
}

function expandTwoDigitYear(yearValue: string): number {
  const parsed = parseInt(yearValue, 10);
  const currentYear = new Date().getFullYear();
  const cutoff = currentYear - 20;
  const twoDigitCandidate = 2000 + parsed;

  return twoDigitCandidate <= cutoff ? twoDigitCandidate : 1900 + parsed;
}

function validateDateParts(value: DateOfBirthValue): DateValidationResult {
  const result: DateValidationResult = {
    validDate: null,
  };

  const dayValue = value.day.trim();
  const monthValue = value.month.trim();
  const yearValue = value.year.trim();

  if (dayValue.length > 0) {
    const day = parseInt(dayValue, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      result.dayError = 'Day must be between 1 and 31';
    }
  }

  if (monthValue.length > 0) {
    const month = parseInt(monthValue, 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
      result.monthError = 'Month must be between 1 and 12';
    }
  }

  if (yearValue.length > 0) {
    const year = parseInt(yearValue, 10);
    const currentYear = new Date().getFullYear();

    if (Number.isNaN(year)) {
      result.yearError = 'Year must be a valid number';
    } else if (year < 1900) {
      result.yearError = 'Year must be 1900 or later';
    } else if (year > currentYear) {
      result.yearError = 'Year cannot be in the future';
    }
  }

  const canBuildDate =
    dayValue.length > 0 &&
    monthValue.length > 0 &&
    yearValue.length >= 4 &&
    !result.dayError &&
    !result.monthError &&
    !result.yearError;

  if (!canBuildDate) {
    return result;
  }

  const day = parseInt(dayValue, 10);
  const month = parseInt(monthValue, 10);
  const year = parseInt(yearValue, 10);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    result.dateError = "This date doesn't exist";
    return result;
  }

  const today = new Date();
  const currentDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (date.getTime() > currentDateOnly.getTime()) {
    result.dateError = 'Date of birth cannot be in the future';
    return result;
  }

  const age = calculateAgeFromBirthDate(date);
  if (age < 3) {
    result.dateError = 'Child must be at least 3 years old';
    return result;
  }

  if (age > 15) {
    result.dateError = 'Child must be 15 years old or younger';
    return result;
  }

  result.validDate = date;
  return result;
}

export function DateOfBirthInput({ value, onChange, onValidChange, externalError }: DateOfBirthInputProps) {
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [expandedYearFrom, setExpandedYearFrom] = useState<string | null>(null);

  const validation = useMemo(() => validateDateParts(value), [value]);

  useEffect(() => {
    onValidChange(validation.validDate);
  }, [onValidChange, validation.validDate]);

  function setDatePart(part: keyof DateOfBirthValue, nextRawValue: string) {
    const maxLength = part === 'year' ? 4 : 2;
    const sanitized = sanitizeDigits(nextRawValue, maxLength);

    if (part === 'year' && sanitized.length !== 4) {
      setExpandedYearFrom(null);
    }

    const nextValue: DateOfBirthValue = {
      ...value,
      [part]: sanitized,
    };

    onChange(nextValue);

    if (part === 'day' && sanitized.length === 2 && isValidDay(sanitized)) {
      monthRef.current?.focus();
    }

    if (part === 'month' && sanitized.length === 2 && isValidMonth(sanitized)) {
      yearRef.current?.focus();
    }
  }

  function handleYearEndEditing() {
    if (value.year.length !== 2) {
      return;
    }

    const expandedYear = expandTwoDigitYear(value.year);
    setExpandedYearFrom(value.year);
    onChange({
      ...value,
      year: `${expandedYear}`,
    });
  }

  const helperError =
    validation.dayError ||
    validation.monthError ||
    validation.yearError ||
    validation.dateError ||
    externalError;

  return (
    <View style={styles.wrapper} accessible accessibilityLabel="Date of birth field group">
      <Text style={styles.groupLabel}>Date of Birth</Text>
      <View style={styles.row}>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Day (DD)</Text>
          <TextInput
            value={value.day}
            onChangeText={(next) => setDatePart('day', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            autoComplete="birthdate-day"
            textContentType="birthdate"
            accessibilityLabel="Day of birth"
            style={[styles.input, styles.dayInput, validation.dayError ? styles.inputError : null]}
            placeholder="DD"
            placeholderTextColor={Colors.placeholder}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Month (MM)</Text>
          <TextInput
            ref={monthRef}
            value={value.month}
            onChangeText={(next) => setDatePart('month', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            autoComplete="birthdate-month"
            textContentType="birthdate"
            accessibilityLabel="Month of birth"
            style={[styles.input, styles.monthInput, validation.monthError ? styles.inputError : null]}
            placeholder="MM"
            placeholderTextColor={Colors.placeholder}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Year (YYYY)</Text>
          <TextInput
            ref={yearRef}
            value={value.year}
            onChangeText={(next) => setDatePart('year', next)}
            onEndEditing={handleYearEndEditing}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={4}
            autoComplete="birthdate-year"
            textContentType="birthdate"
            accessibilityLabel="Year of birth"
            style={[styles.input, styles.yearInput, validation.yearError ? styles.inputError : null]}
            placeholder="YYYY"
            placeholderTextColor={Colors.placeholder}
          />
        </View>
      </View>

      {expandedYearFrom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo year expansion"
          onPress={() => {
            onChange({ ...value, year: expandedYearFrom });
            setExpandedYearFrom(null);
            yearRef.current?.focus();
          }}
          style={({ pressed }) => [styles.correctionChip, pressed ? styles.correctionChipPressed : null]}
        >
          <Text style={styles.correctionChipText}>
            Year expanded from {expandedYearFrom} to {value.year}. Tap to edit.
          </Text>
        </Pressable>
      ) : null}

      {helperError ? <Text style={styles.errorText}>{helperError}</Text> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  fieldWrap: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.text,
    ...Typography.body,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  dayInput: {
    width: 48,
  },
  monthInput: {
    width: 56,
  },
  yearInput: {
    width: 80,
  },
  inputError: {
    borderColor: Colors.errorText,
  },
  correctionChip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  correctionChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  correctionChipText: {
    ...Typography.caption,
    color: Colors.primaryDark,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
});
