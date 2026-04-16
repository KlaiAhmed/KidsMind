// Apps/mobile/components/chat/ChatInput.tsx
import { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { AgeGroup } from '@/types/child';

const MIN_CHILD_TAP_TARGET = 56;
const MAX_MESSAGE_LENGTH = 500;

interface ChatInputProps {
  value: string;
  ageGroup: AgeGroup;
  isLoading: boolean;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
}

function getPlaceholder(ageGroup: AgeGroup): string {
  if (ageGroup === '3-6') {
    return 'What do you want to learn today?';
  }

  return 'Ask me anything!';
}

function ChatInputComponent({ value, ageGroup, isLoading, onChangeText, onSend }: ChatInputProps) {
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.inputShell}>
        <TextInput
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          value={value}
          onChangeText={onChangeText}
          placeholder={getPlaceholder(ageGroup)}
          placeholderTextColor={Colors.placeholder}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (canSend) {
              onSend(value);
            }
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => onSend(value)}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend ? styles.sendButtonDisabled : null,
            pressed && canSend ? styles.sendButtonPressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={canSend ? Colors.white : Colors.textSecondary}
          />
        </Pressable>
      </View>

      {value.length >= 400 ? (
        <Text style={styles.counterText}>{value.length}/{MAX_MESSAGE_LENGTH}</Text>
      ) : null}
    </View>
  );
}

export const ChatInput = memo(ChatInputComponent);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  inputShell: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    minHeight: MIN_CHILD_TAP_TARGET,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: MIN_CHILD_TAP_TARGET - Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlignVertical: 'center',
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: MIN_CHILD_TAP_TARGET,
    height: MIN_CHILD_TAP_TARGET,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  counterText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    paddingRight: Spacing.xs,
  },
});
