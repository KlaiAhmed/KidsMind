import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { Colors, Spacing } from '@/constants/theme';

const BAR_COUNT = 16;
const MIN_DB = -160;
const MAX_DB = 0;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 40;
const BAR_DELAY_MS = 20;
const WAVEFORM_BARS = Array.from({ length: BAR_COUNT }, (_, index) => index);

interface AudioWaveformProps {
  metering: number;
}

interface WaveformBarProps {
  metering: number;
  index: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getBarHeight(metering: number, index: number): number {
  const normalizedMetering = (clamp(metering, MIN_DB, MAX_DB) - MIN_DB) / (MAX_DB - MIN_DB);
  const centerDistance = Math.abs(index - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
  const shape = 1 - centerDistance * 0.42;
  return MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * normalizedMetering * shape;
}

function WaveformBar({ metering, index }: WaveformBarProps) {
  const height = useSharedValue(MIN_BAR_HEIGHT);

  useEffect(() => {
    height.value = withDelay(
      index * BAR_DELAY_MS,
      withSpring(getBarHeight(metering, index), {
        stiffness: 200,
        damping: 10,
      }),
    );
  }, [height, index, metering]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

function AudioWaveformComponent({ metering }: AudioWaveformProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Recording volume">
      {WAVEFORM_BARS.map((index) => (
        <WaveformBar key={index} metering={metering} index={index} />
      ))}
    </View>
  );
}

export const AudioWaveform = memo(AudioWaveformComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: MAX_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  bar: {
    width: 3,
    minHeight: MIN_BAR_HEIGHT,
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
});
