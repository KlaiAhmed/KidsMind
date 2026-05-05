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

const MIN_MINUTES = 0;
const MAX_MINUTES = 1439;
const STEP_MINUTES = 15;
const MIN_WINDOW_MINUTES = 30;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const TOOLTIP_WIDTH = 64;

export interface TimeRangeSliderProps {
  startMinutes: number;
  endMinutes: number;
  onChange: (start: number, end: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function snapToStep(value: number): number {
  'worklet';
  const snapped = Math.round(value / STEP_MINUTES) * STEP_MINUTES;
  return clamp(snapped, MIN_MINUTES, MAX_MINUTES);
}

function formatTime(value: number): string {
  const clamped = clamp(Math.round(value), MIN_MINUTES, MAX_MINUTES);
  return `${Math.floor(clamped / 60).toString().padStart(2, '0')}:${(clamped % 60)
    .toString()
    .padStart(2, '0')}`;
}

function sanitizeRange(startMinutes: number, endMinutes: number): { start: number; end: number } {
  const end = clamp(snapToStep(endMinutes), MIN_WINDOW_MINUTES, MAX_MINUTES);
  const start = clamp(snapToStep(startMinutes), MIN_MINUTES, end - MIN_WINDOW_MINUTES);
  return { start, end };
}

function minutesToX(value: number, usableWidth: number): number {
  'worklet';
  if (usableWidth <= 0) {
    return 0;
  }

  return (value / MAX_MINUTES) * usableWidth;
}

function xToMinutes(value: number, usableWidth: number): number {
  'worklet';
  if (usableWidth <= 0) {
    return MIN_MINUTES;
  }

  return (value / usableWidth) * MAX_MINUTES;
}

export function TimeRangeSlider({ startMinutes, endMinutes, onChange }: TimeRangeSliderProps) {
  const safeRange = useMemo(
    () => sanitizeRange(startMinutes, endMinutes),
    [endMinutes, startMinutes],
  );
  const [trackWidth, setTrackWidth] = useState(0);
  const [tooltipRange, setTooltipRange] = useState(safeRange);
  const startX = useSharedValue(0);
  const endX = useSharedValue(0);
  const startDragX = useSharedValue(0);
  const endDragX = useSharedValue(0);
  const activeStart = useSharedValue(safeRange.start);
  const activeEnd = useSharedValue(safeRange.end);

  const usableWidth = Math.max(trackWidth - THUMB_SIZE, 0);

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  function updateStartTooltip(nextStart: number) {
    setTooltipRange((current) => ({ ...current, start: nextStart }));
  }

  function updateEndTooltip(nextEnd: number) {
    setTooltipRange((current) => ({ ...current, end: nextEnd }));
  }

  useEffect(() => {
    setTooltipRange(safeRange);
    activeStart.value = safeRange.start;
    activeEnd.value = safeRange.end;
    startX.value = withTiming(minutesToX(safeRange.start, usableWidth), { duration: 160 });
    endX.value = withTiming(minutesToX(safeRange.end, usableWidth), { duration: 160 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRange, usableWidth]);

  const { endGesture, startGesture } = useMemo(
    () => {
      const start = Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin(() => {
          'worklet';
          startDragX.value = startX.value;
        })
        .onUpdate((event) => {
          'worklet';
          if (usableWidth <= 0) {
            return;
          }

          const maxStart = minutesToX(activeEnd.value - MIN_WINDOW_MINUTES, usableWidth);
          const nextX = clamp(startDragX.value + event.translationX, 0, maxStart);
          const nextStart = clamp(snapToStep(xToMinutes(nextX, usableWidth)), MIN_MINUTES, activeEnd.value - MIN_WINDOW_MINUTES);

          startX.value = nextX;

          if (activeStart.value !== nextStart) {
            activeStart.value = nextStart;
            runOnJS(updateStartTooltip)(nextStart);
          }
        })
        .onEnd(() => {
          'worklet';
          const snappedX = minutesToX(activeStart.value, usableWidth);

          startX.value = withSpring(snappedX, { damping: 20, stiffness: 260, mass: 0.8 });
          runOnJS(onChange)(activeStart.value, activeEnd.value);
        });

      const end = Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin(() => {
          'worklet';
          endDragX.value = endX.value;
        })
        .onUpdate((event) => {
          'worklet';
          if (usableWidth <= 0) {
            return;
          }

          const minEnd = minutesToX(activeStart.value + MIN_WINDOW_MINUTES, usableWidth);
          const nextX = clamp(endDragX.value + event.translationX, minEnd, usableWidth);
          const nextEnd = clamp(snapToStep(xToMinutes(nextX, usableWidth)), activeStart.value + MIN_WINDOW_MINUTES, MAX_MINUTES);

          endX.value = nextX;

          if (activeEnd.value !== nextEnd) {
            activeEnd.value = nextEnd;
            runOnJS(updateEndTooltip)(nextEnd);
          }
        })
        .onEnd(() => {
          'worklet';
          const snappedX = minutesToX(activeEnd.value, usableWidth);

          endX.value = withSpring(snappedX, { damping: 20, stiffness: 260, mass: 0.8 });
          runOnJS(onChange)(activeStart.value, activeEnd.value);
        });

      return {
        startGesture: start.simultaneousWithExternalGesture(end),
        endGesture: end.simultaneousWithExternalGesture(start),
      };
    },
    [activeEnd, activeStart, endDragX, endX, onChange, startDragX, startX, usableWidth],
  );

  const fillStyle = useAnimatedStyle(() => ({
    left: startX.value + THUMB_SIZE / 2,
    width: Math.max(endX.value - startX.value, 0),
  }));

  const startThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: startX.value }],
  }));

  const endThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: endX.value }],
  }));

  const startTooltipStyle = useAnimatedStyle(() => {
    const centeredX = startX.value + THUMB_SIZE / 2 - TOOLTIP_WIDTH / 2;
    const maxTooltipX = Math.max(trackWidth - TOOLTIP_WIDTH, 0);

    return {
      transform: [{ translateX: clamp(centeredX, 0, maxTooltipX) }],
    };
  });

  const endTooltipStyle = useAnimatedStyle(() => {
    const centeredX = endX.value + THUMB_SIZE / 2 - TOOLTIP_WIDTH / 2;
    const maxTooltipX = Math.max(trackWidth - TOOLTIP_WIDTH, 0);

    return {
      transform: [{ translateX: clamp(centeredX, 0, maxTooltipX) }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.tooltip, startTooltipStyle]}>
        <Text numberOfLines={1} style={styles.tooltipText}>
          {formatTime(tooltipRange.start)}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.tooltip, endTooltipStyle]}>
        <Text numberOfLines={1} style={styles.tooltipText}>
          {formatTime(tooltipRange.end)}
        </Text>
      </Animated.View>

      <View onLayout={handleLayout} style={styles.touchArea}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <GestureDetector gesture={startGesture}>
          <Animated.View
            accessibilityLabel={`Start time ${formatTime(tooltipRange.start)}`}
            accessibilityRole="adjustable"
            style={[styles.thumb, startThumbStyle]}
          />
        </GestureDetector>
        <GestureDetector gesture={endGesture}>
          <Animated.View
            accessibilityLabel={`End time ${formatTime(tooltipRange.end)}`}
            accessibilityRole="adjustable"
            style={[styles.thumb, endThumbStyle]}
          />
        </GestureDetector>
      </View>
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
    height: TRACK_HEIGHT,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
});
