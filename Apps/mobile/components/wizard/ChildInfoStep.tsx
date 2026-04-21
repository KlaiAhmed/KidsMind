import { useCallback, useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { FormTextInput } from '@/components/ui/FormTextInput';
import { DateOfBirthInput, type DateOfBirthValue } from '@/components/wizard/DateOfBirthInput';
import { EducationLevelSelector } from '@/components/wizard/EducationLevelSelector';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { ChildProfileWizardFormValues } from '@/src/schemas/childProfileWizardSchema';
import { deriveEducationLevelFromBirthDate, toIsoDateString } from '@/src/utils/childProfileWizard';

export function ChildInfoStep() {
  const {
    control,
    formState: { errors },
    setValue,
    trigger,
  } = useFormContext<ChildProfileWizardFormValues>();

  const educationLevel = useWatch({ control, name: 'childInfo.educationLevel' });
  const derivedEducationLevel = useWatch({ control, name: 'childInfo.derivedEducationLevel' });
  const mismatchAcknowledged = useWatch({ control, name: 'childInfo.mismatchAcknowledged' });
  const educationManuallySet = useWatch({ control, name: 'childInfo.educationManuallySet' });

  const educationManuallySetRef = useRef(educationManuallySet);
  educationManuallySetRef.current = educationManuallySet;
  const educationLevelRef = useRef(educationLevel);
  educationLevelRef.current = educationLevel;

  const dobError =
    errors.childInfo?.dob?.message ||
    errors.childInfo?.birthDateIso?.message;

  const handleValidDateChange = useCallback((nextDate: Date | null) => {
    if (!nextDate) {
      setValue('childInfo.birthDateIso', null, { shouldDirty: true, shouldValidate: false });
      setValue('childInfo.derivedEducationLevel', null, { shouldDirty: true, shouldValidate: false });
      setValue('childInfo.mismatchAcknowledged', false, { shouldDirty: true, shouldValidate: false });
      void trigger(['childInfo.dob', 'childInfo.birthDateIso', 'childInfo.educationLevel', 'childInfo.mismatchAcknowledged']);
      return;
    }

    const isoDate = toIsoDateString(nextDate.getDate(), nextDate.getMonth() + 1, nextDate.getFullYear());
    const derived = deriveEducationLevelFromBirthDate(nextDate);

    setValue('childInfo.birthDateIso', isoDate, { shouldDirty: true, shouldValidate: false });
    setValue('childInfo.derivedEducationLevel', derived, { shouldDirty: true, shouldValidate: false });

    const currentEducationManuallySet = educationManuallySetRef.current;
    const currentEducationLevel = educationLevelRef.current;

    if (!currentEducationManuallySet && derived) {
      setValue('childInfo.educationLevel', derived, { shouldDirty: true, shouldValidate: false });
      setValue('childInfo.mismatchAcknowledged', false, { shouldDirty: true, shouldValidate: false });
    } else if (currentEducationLevel && derived && currentEducationLevel !== derived) {
      setValue('childInfo.mismatchAcknowledged', false, { shouldDirty: true, shouldValidate: false });
    }

    void trigger(['childInfo.dob', 'childInfo.birthDateIso', 'childInfo.educationLevel', 'childInfo.mismatchAcknowledged']);
  }, [setValue, trigger]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Child Info</Text>
      <Text style={styles.subtitle}>Tell us about your child so KidsMind can personalize learning safely.</Text>

      <Controller
        control={control}
        name="childInfo.nickname"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextInput
label="Child nickname"
          placeholder="Enter child nickname"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.childInfo?.nickname?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="childInfo.dob"
        render={({ field: { value, onChange } }) => (
          <DateOfBirthInput
            value={value as DateOfBirthValue}
            onChange={(next) => onChange(next)}
            onValidChange={handleValidDateChange}
            externalError={dobError}
          />
        )}
      />

      <EducationLevelSelector
        value={educationLevel}
        derivedFromDOB={derivedEducationLevel}
        isConfirmed={mismatchAcknowledged}
        onChange={(nextValue) => {
          setValue('childInfo.educationLevel', nextValue, { shouldDirty: true, shouldValidate: true });
          setValue('childInfo.educationManuallySet', true, { shouldDirty: true, shouldValidate: true });
          setValue('childInfo.mismatchAcknowledged', false, { shouldDirty: true, shouldValidate: true });
        }}
        onConfirmedChange={(nextValue) => {
          setValue('childInfo.mismatchAcknowledged', nextValue, { shouldDirty: true, shouldValidate: true });
        }}
        error={errors.childInfo?.mismatchAcknowledged?.message || errors.childInfo?.educationLevel?.message}
      />
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
});
