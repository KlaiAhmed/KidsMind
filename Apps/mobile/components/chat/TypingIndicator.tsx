// Apps/mobile/components/chat/TypingIndicator.tsx
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors, Radii, Spacing } from '@/constants/theme';

export function TypingIndicator() {
  const dotOne = useRef(new Animated.Value(0.35)).current;
  const dotTwo = useRef(new Animated.Value(0.35)).current;
  const dotThree = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const createDotLoop = (value: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.35,
            duration: 280,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      createDotLoop(dotOne, 0),
      createDotLoop(dotTwo, 120),
      createDotLoop(dotThree, 240),
    ];

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dotOne, dotThree, dotTwo]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity: dotOne }]} />
      <Animated.View style={[styles.dot, { opacity: dotTwo }]} />
      <Animated.View style={[styles.dot, { opacity: dotThree }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.textSecondary,
  },
});
