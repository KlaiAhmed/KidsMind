import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ttsSpeak, ttsStop, ttsSubscribe } from '@/src/utils/tts';
import type { AgeGroup } from '@/types/child';

const COPY_FEEDBACK_MS = 1200;

interface MessageActionBarProps {
  messageId: string;
  childId?: string | null;
  sessionId: string;
  content: string;
  ageGroup: AgeGroup;
  voiceEnabled?: boolean;
  onRetry: () => void;
}

export function MessageActionBar({
  messageId,
  childId,
  sessionId,
  content,
  ageGroup,
  voiceEnabled = false,
  onRetry,
}: MessageActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!voiceEnabled) {
      ttsStop();
      setIsSpeaking(false);
      setIsVoiceLoading(false);
      setVoiceError(null);
      return undefined;
    }

    return ttsSubscribe((state) => {
      setIsSpeaking(state.activeMessageId === messageId);
      setIsVoiceLoading(state.loadingMessageId === messageId);
      setVoiceError(state.errorMessageId === messageId ? state.error : null);
    });
  }, [messageId, voiceEnabled]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [content]);

  const handleRetry = useCallback(() => {
    setTimeout(onRetry, 200);
  }, [onRetry]);

  const handleVoice = useCallback(() => {
    if (!voiceEnabled || isVoiceLoading) {
      return;
    }

    void ttsSpeak({
      text: content,
      childId,
      sessionId,
      messageId,
      voiceEnabled,
    });
  }, [childId, content, isVoiceLoading, messageId, sessionId, voiceEnabled]);

  const isYoung = ageGroup === '3-6';
  const iconSize = isYoung ? 20 : 18;
  const voiceDisabled = isVoiceLoading || !childId;

  return (
    <Animated.View entering={FadeIn.duration(180).easing(Easing.out(Easing.ease))} style={styles.container}>
      <View style={styles.actionsRow}>
        {/* a11y: Copy action announces its purpose and keeps visual state separate. */}
        <Pressable
          onPress={handleCopy}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Copy message"
        >
          <Animated.View
            key={copied ? 'copied' : 'copy'}
            entering={FadeIn.duration(150).easing(Easing.out(Easing.ease))}
            exiting={FadeOut.duration(150).easing(Easing.out(Easing.ease))}
          >
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={iconSize}
              color={copied ? Colors.success : Colors.textTertiary}
            />
          </Animated.View>
        </Pressable>

        {/* a11y: Retry action is available for a completed AI response. */}
        <Pressable
          onPress={handleRetry}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Retry response"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={iconSize}
            color={Colors.textTertiary}
          />
        </Pressable>

        {/* a11y: TTS action names both read and stop states. */}
        {voiceEnabled ? (
          <Pressable
            onPress={handleVoice}
            disabled={voiceDisabled}
            style={[styles.action, isYoung && styles.actionLarge, voiceDisabled && styles.actionDisabled]}
            accessibilityRole="button"
            accessibilityLabel={isVoiceLoading ? 'Preparing read aloud' : isSpeaking ? 'Stop reading' : 'Read aloud'}
            accessibilityState={{ disabled: voiceDisabled }}
          >
            {isVoiceLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name={isSpeaking ? 'stop' : 'volume-high'}
                size={isYoung ? 22 : iconSize}
                color={isSpeaking ? Colors.primary : Colors.textTertiary}
              />
            )}
          </Pressable>
        ) : null}
      </View>

      {voiceEnabled && voiceError ? <Text style={styles.errorText}>{voiceError}</Text> : null}
    </Animated.View>
  );
}

const TAP_TARGET = 36;
const TAP_TARGET_LARGE = 40;

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
    paddingLeft: 32,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  action: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  actionLarge: {
    width: TAP_TARGET_LARGE,
    height: TAP_TARGET_LARGE,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
    marginTop: 2,
    maxWidth: '88%',
  },
});
