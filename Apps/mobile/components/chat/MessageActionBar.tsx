import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing } from '@/constants/theme';
import { ttsSpeak, ttsSubscribe } from '@/src/utils/tts';
import type { AgeGroup } from '@/types/child';

const COPY_FEEDBACK_MS = 1200;

interface MessageActionBarProps {
  messageId: string;
  content: string;
  ageGroup: AgeGroup;
  onRetry: () => void;
}

export function MessageActionBar({
  messageId,
  content,
  ageGroup,
  onRetry,
}: MessageActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return ttsSubscribe((speakingId) => {
      setIsSpeaking(speakingId === messageId);
    });
  }, [messageId]);

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
    ttsSpeak(content, ageGroup, messageId);
  }, [content, ageGroup, messageId]);

  const isYoung = ageGroup === '3-6';
  const iconSize = isYoung ? 20 : 18;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <Pressable
        onPress={handleCopy}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel="Copy message"
      >
        <MaterialCommunityIcons
          name={copied ? 'check' : 'content-copy'}
          size={iconSize}
          color={copied ? Colors.success : Colors.textTertiary}
        />
      </Pressable>

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

      <Pressable
        onPress={handleVoice}
        style={[styles.action, isYoung && styles.actionLarge]}
        accessibilityRole="button"
        accessibilityLabel={isSpeaking ? 'Stop speaking' : 'Listen to message'}
      >
        <MaterialCommunityIcons
          name={isSpeaking ? 'stop' : 'volume-high'}
          size={isYoung ? 22 : iconSize}
          color={isSpeaking ? Colors.primary : Colors.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

const TAP_TARGET = 36;
const TAP_TARGET_LARGE = 40;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingLeft: 32,
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
});
