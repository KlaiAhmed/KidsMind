import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';

export const DEFAULT_DAILY_ALLOWANCE_MINUTES = 30;
const DEFAULT_MAX = 600;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const TOOLTIP_WIDTH = 72;
const DAILY_ALLOWANCE_STEPS = [
  30,
  40,
  50,
  60,
  75,
  90,
  105,
  120,
  150,
  180,
  240,
  300,
  360,
  420,
  480,
  540,
  600,
];

export interface SteppedSliderProps {
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
}

function buildStepsArray(min: number, max: number): number[] {
  return DAILY_ALLOWANCE_STEPS.filter((step) => step >= min && step <= max);
}

function nearestStep(value: number, steps: number[]): number {
  if (steps.length === 0) {
    return value;
  }

  return steps.reduce((nearest, step) =>
    Math.abs(step - value) < Math.abs(nearest - value) ? step : nearest,
  steps[0]);
}

function formatRemainingMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatSteppedSliderValue(totalMinutes: number): string {
  return formatRemainingMinutes(totalMinutes);
}

export function SteppedSlider({
  value,
  onChange,
  min = DEFAULT_DAILY_ALLOWANCE_MINUTES,
  max = DEFAULT_MAX,
}: SteppedSliderProps) {
  const stepsArray = useMemo(() => buildStepsArray(min, max), [max, min]);
  const clampedValue = nearestStep(Math.max(min, Math.min(value, max)), stepsArray);
  const [trackWidth, setTrackWidth] = useState(0);
  const [tooltipValue, setTooltipValue] = useState(clampedValue);
  const thumbX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const activeStep = useSharedValue(clampedValue);

  const usableWidth = Math.max(trackWidth - THUMB_SIZE, 0);

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  useEffect(() => {
    setTooltipValue(clampedValue);
    activeStep.value = clampedValue;
    thumbX.value = withTiming(
      max === min || usableWidth <= 0 ? 0 : ((clampedValue - min) / (max - min)) * usableWidth,
      { duration: 160 },
    );
  }, [activeStep, clampedValue, max, min, thumbX, usableWidth]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin(() => {
          'worklet';
          dragStartX.value = thumbX.value;
        })
        .onUpdate((event) => {
          'worklet';
          if (usableWidth <= 0 || stepsArray.length === 0) {
            return;
          }

          const nextX = Math.min(Math.max(dragStartX.value + event.translationX, 0), usableWidth);
          const stepIndex = Math.min(
            Math.max(Math.round((nextX / usableWidth) * (stepsArray.length - 1)), 0),
            stepsArray.length - 1,
          );
          const closestStep = stepsArray[stepIndex];
          const snappedX = stepsArray.length === 1
            ? 0
            : (stepIndex / (stepsArray.length - 1)) * usableWidth;

          thumbX.value = snappedX;

          if (activeStep.value !== closestStep) {
            activeStep.value = closestStep;
            runOnJS(setTooltipValue)(closestStep);
            runOnJS(onChange)(closestStep);
          }
        })
        .onEnd(() => {
          'worklet';
          const snappedValue = activeStep.value;
          const snappedIndex = stepsArray.indexOf(snappedValue);
          const snappedX = max === min || usableWidth <= 0 || snappedIndex < 0
            ? 0
            : (snappedIndex / Math.max(stepsArray.length - 1, 1)) * usableWidth;

          thumbX.value = withSpring(snappedX, { damping: 20, stiffness: 260, mass: 0.8 });
          runOnJS(onChange)(snappedValue);
        }),
    [activeStep, dragStartX, max, min, onChange, stepsArray, thumbX, usableWidth],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const tooltipStyle = useAnimatedStyle(() => {
    const centeredX = thumbX.value + THUMB_SIZE / 2 - TOOLTIP_WIDTH / 2;
    const maxTooltipX = Math.max(trackWidth - TOOLTIP_WIDTH, 0);

    return {
      transform: [{ translateX: Math.min(Math.max(centeredX, 0), maxTooltipX) }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.tooltip, tooltipStyle]}>
        <Text numberOfLines={1} style={styles.tooltipText}>
          {formatRemainingMinutes(tooltipValue)}
        </Text>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <View onLayout={handleLayout} style={styles.touchArea}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 34,
    paddingBottom: Spacing.xs,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    minHeight: 26,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  tooltipText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  touchArea: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB_SIZE / 2,
    right: THUMB_SIZE / 2,
    top: (44 - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (44 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
});
