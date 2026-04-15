import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

const TOTAL_SEGMENTS = 40;
const RING_SIZE = 176;
const INNER_SIZE = 122;

interface ProgressRingProps {
  completedMinutes: number;
  goalMinutes: number;
  color?: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function ProgressRingComponent({
  completedMinutes,
  goalMinutes,
  color = Colors.primary,
}: ProgressRingProps) {
  const targetPercent = goalMinutes > 0 ? clamp(Math.round((completedMinutes / goalMinutes) * 100)) : 0;
  const [displayPercent, setDisplayPercent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setDisplayPercent(Math.round(value));
    });

    Animated.timing(progressAnim, {
      toValue: targetPercent,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || targetPercent < 100) {
        return;
      }

      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progressAnim, pulseAnim, targetPercent]);

  const activeSegments = useMemo(
    () => Math.round((displayPercent / 100) * TOTAL_SEGMENTS),
    [displayPercent]
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.ringContainer}>
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => {
          const rotation = (index * 360) / TOTAL_SEGMENTS;
          const isActive = index < activeSegments;

          return (
            <View
              key={`segment-${index}`}
              style={[
                styles.segmentTrack,
                {
                  transform: [{ rotate: `${rotation}deg` }, { translateY: -(RING_SIZE / 2) + 9 }],
                  backgroundColor: isActive ? color : Colors.surfaceContainerHigh,
                },
              ]}
            />
          );
        })}

        <View style={styles.innerCircle}>
          <Text allowFontScaling={false} style={styles.percentText}>
            {displayPercent}%
          </Text>
          <Text style={styles.minutesText}>
            {completedMinutes} / {goalMinutes} min
          </Text>
          {displayPercent >= 100 ? <Text style={styles.goalText}>Goal reached!</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

export const ProgressRing = memo(ProgressRingComponent);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTrack: {
    position: 'absolute',
    width: 10,
    height: 18,
    borderRadius: Radii.full,
  },
  innerCircle: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  percentText: {
    ...Typography.headline,
    color: Colors.text,
  },
  minutesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  goalText: {
    ...Typography.captionMedium,
    color: Colors.success,
  },
});
