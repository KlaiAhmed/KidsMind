// Apps/mobile/components/profile/XPProgressBar.tsx
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

interface XPProgressBarProps {
  currentXP: number;
  xpToNextLevel: number;
  level: number;
  animated?: boolean;
}

export function XPProgressBar({ currentXP, xpToNextLevel, level, animated = true }: XPProgressBarProps) {
  const safeCurrentXp = Math.max(0, Math.floor(currentXP));
  const safeXpToNext = Math.max(1, Math.floor(xpToNextLevel));
  const progressRatio = Math.max(0, Math.min(1, safeCurrentXp / safeXpToNext));
  const animatedProgress = useRef(new Animated.Value(animated ? 0 : progressRatio)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressRatio,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progressRatio]);

  const progressWidth = useMemo(
    () =>
      animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [animatedProgress]
  );

  const xpLabel = `${Math.min(safeCurrentXp, safeXpToNext)} / ${safeXpToNext} XP to Level ${level + 1}`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Level ${level}, ${Math.min(safeCurrentXp, safeXpToNext)} of ${safeXpToNext} XP`}
      style={styles.container}
    >
      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.levelText}>Level {level + 1}</Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: progressWidth }]} />
      </View>

      <Text style={styles.caption}>{xpLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  track: {
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  caption: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
