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
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod/v4';

import { LabeledToggleRow } from '@/components/ui/LabeledToggleRow';
import { Colors, Gradients, Radii, Shadows, Sizing, Spacing, Typography } from '@/constants/theme';
import { toApiErrorMessage, useAuth } from '@/contexts/AuthContext';
import { updateChildRules } from '@/services/childService';
import {
  ALL_SUBJECT_VALUES,
  deriveBlockedSubjects,
  SUBJECT_OPTIONS,
} from '@/src/utils/childProfileWizard';
import { getSubjectGridVisual } from '@/src/utils/profilePresentation';
import type { ChildProfile, SubjectKey } from '@/types/child';

const subjectValues = ALL_SUBJECT_VALUES;
const EMPTY_SUBJECTS: SubjectKey[] = [];

const learningSchema = z.object({
  allowedSubjects: z.array(z.enum(subjectValues)).min(1, 'Choose at least one subject'),
  blockedSubjects: z.array(z.enum(subjectValues)),
  homeworkModeEnabled: z.boolean(),
});

type LearningFormValues = z.infer<typeof learningSchema>;

interface LearningEditModalProps {
  visible: boolean;
  child: ChildProfile;
  onClose: () => void;
}

function buildDefaultValues(child: ChildProfile): LearningFormValues {
  const allowedSubjects = child.rules?.allowedSubjects?.length
    ? child.rules.allowedSubjects
    : child.subjectIds;

  return {
    allowedSubjects,
    blockedSubjects: deriveBlockedSubjects(allowedSubjects),
    homeworkModeEnabled: child.rules?.homeworkModeEnabled ?? true,
  };
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

function SubjectIcon({ subject }: { subject: SubjectKey }) {
  const visual = getSubjectGridVisual(subject);

  return (
    <View style={[styles.subjectIcon, { backgroundColor: visual.iconBackground }]}>
      <MaterialCommunityIcons color={visual.iconColor} name={visual.iconName} size={18} />
    </View>
  );
}

export function LearningEditModal({ visible, child, onClose }: LearningEditModalProps) {
  const queryClient = useQueryClient();
  const { updateChildProfile } = useAuth();
  const [modalError, setModalError] = useState<string | null>(null);

  const methods = useForm<LearningFormValues>({
    resolver: zodResolver(learningSchema),
    defaultValues: buildDefaultValues(child),
    mode: 'onChange',
  });

  const { control, formState, getValues, handleSubmit, reset, setValue } = methods;
  const allowedSubjects = useWatch({ control, name: 'allowedSubjects' }) ?? EMPTY_SUBJECTS;
  const homeworkModeEnabled = useWatch({ control, name: 'homeworkModeEnabled' }) ?? true;
  const selectedSubjectSet = useMemo(() => new Set(allowedSubjects), [allowedSubjects]);

  useEffect(() => {
    if (visible) {
      reset(buildDefaultValues(child));
      setModalError(null);
    }
  }, [child, reset, visible]);

  const saveMutation = useMutation({
    mutationFn: async (values: LearningFormValues) =>
      updateChildRules(child.id, {
        allowedSubjects: values.allowedSubjects,
        blockedSubjects: values.blockedSubjects,
        homeworkModeEnabled: values.homeworkModeEnabled,
      }),
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

  function toggleSubject(subject: SubjectKey) {
    const currentSubjects = getValues('allowedSubjects') ?? [];
    const nextSubjects = currentSubjects.includes(subject)
      ? currentSubjects.filter((entry) => entry !== subject)
      : [...currentSubjects, subject];

    setValue('allowedSubjects', nextSubjects, { shouldDirty: true, shouldValidate: true });
    setValue('blockedSubjects', deriveBlockedSubjects(nextSubjects), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const isBusy = saveMutation.isPending;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel learning edits"
            disabled={isBusy}
            onPress={onClose}
            style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
          >
            <Text style={styles.headerActionText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Learning Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {modalError ? <ErrorCard message={modalError} onDismiss={() => setModalError(null)} /> : null}

          <View pointerEvents={isBusy ? 'none' : 'auto'} style={styles.formStack}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <View style={styles.listStack}>
                {SUBJECT_OPTIONS.map((subject) => {
                  const selected = selectedSubjectSet.has(subject.value);

                  return (
                    <LabeledToggleRow
                      key={subject.value}
                      accessibilityLabel={`${subject.label} subject`}
                      disabled={isBusy}
                      label={subject.label}
                      leadingAccessory={<SubjectIcon subject={subject.value} />}
                      onValueChange={() => toggleSubject(subject.value)}
                      value={selected}
                    />
                  );
                })}
              </View>
              {formState.errors.allowedSubjects?.message ? (
                <Text style={styles.inlineErrorText}>{formState.errors.allowedSubjects.message}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Controller
                control={control}
                name="homeworkModeEnabled"
                render={({ field: { onChange, value } }) => (
                  <LabeledToggleRow
                    accessibilityLabel="Homework mode"
                    description="Prioritize educational activities over open exploration."
                    disabled={isBusy}
                    label="Homework Mode"
                    onValueChange={onChange}
                    value={value ?? homeworkModeEnabled}
                  />
                )}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save learning changes"
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
            accessibilityLabel="Cancel learning changes"
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
  listStack: {
    gap: Spacing.sm,
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
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
