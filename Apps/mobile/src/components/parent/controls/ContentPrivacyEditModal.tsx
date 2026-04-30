import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { z } from 'zod/v4';

import { LabeledToggleRow } from '@/components/ui/LabeledToggleRow';
import { Colors, Gradients, Radii, Shadows, Sizing, Spacing, Typography } from '@/constants/theme';
import { toApiErrorMessage, useAuth } from '@/contexts/AuthContext';
import { updateChildRules } from '@/services/childService';
import { ErrorCard } from '@/src/components/parent/ParentDashboardStates';
import type { ChildProfile } from '@/types/child';

const contentPrivacySchema = z.object({
  voiceModeEnabled: z.boolean(),
  audioStorageEnabled: z.boolean(),
  conversationHistoryEnabled: z.boolean(),
});

type ContentPrivacyFormValues = z.infer<typeof contentPrivacySchema>;

interface ContentPrivacyEditModalProps {
  visible: boolean;
  child: ChildProfile;
  onClose: () => void;
}

function buildDefaultValues(child: ChildProfile): ContentPrivacyFormValues {
  return {
    voiceModeEnabled: child.rules?.voiceModeEnabled ?? true,
    audioStorageEnabled: child.rules?.audioStorageEnabled ?? false,
    conversationHistoryEnabled: child.rules?.conversationHistoryEnabled ?? true,
  };
}

export function ContentPrivacyEditModal({ visible, child, onClose }: ContentPrivacyEditModalProps) {
  const queryClient = useQueryClient();
  const { updateChildProfile } = useAuth();
  const [modalError, setModalError] = useState<string | null>(null);

  const methods = useForm<ContentPrivacyFormValues>({
    resolver: zodResolver(contentPrivacySchema),
    defaultValues: buildDefaultValues(child),
    mode: 'onChange',
  });

  const { control, getValues, handleSubmit, reset } = methods;

  useEffect(() => {
    if (visible) {
      reset(buildDefaultValues(child));
      setModalError(null);
    }
  }, [child, reset, visible]);

  const saveMutation = useMutation({
    mutationFn: async (values: ContentPrivacyFormValues) =>
      updateChildRules(child.id, {
        voiceModeEnabled: values.voiceModeEnabled,
        audioStorageEnabled: values.audioStorageEnabled,
        conversationHistoryEnabled: values.conversationHistoryEnabled,
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

  const isBusy = saveMutation.isPending;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel content settings edits"
            disabled={isBusy}
            onPress={onClose}
            style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
          >
            <Text style={styles.headerActionText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Content Settings</Text>
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
              title="Content update failed"
            />
          ) : null}

          <View pointerEvents={isBusy ? 'none' : 'auto'} style={styles.card}>
            <Controller
              control={control}
              name="voiceModeEnabled"
              render={({ field: { onChange, value } }) => (
                <LabeledToggleRow
                  accessibilityLabel="Mic access"
                  description="Allow spoken questions and voice replies during learning sessions."
                  disabled={isBusy}
                  label="Mic Access"
                  onValueChange={onChange}
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="audioStorageEnabled"
              render={({ field: { onChange, value } }) => (
                <LabeledToggleRow
                  accessibilityLabel="Audio storage"
                  description="Store voice clips for parent support and follow-up."
                  disabled={isBusy}
                  label="Audio Storage"
                  onValueChange={onChange}
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="conversationHistoryEnabled"
              render={({ field: { onChange, value } }) => (
                <LabeledToggleRow
                  accessibilityLabel="Conversation history"
                  description="Keep completed chat sessions available for parent review."
                  disabled={isBusy}
                  label="Conversation History"
                  onValueChange={onChange}
                  value={value}
                />
              )}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save content settings"
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
            accessibilityLabel="Cancel content settings"
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
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.card,
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
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
