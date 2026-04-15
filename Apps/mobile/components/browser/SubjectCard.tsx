import { memo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { Subject } from '@/types/child';

interface SubjectCardProps {
  subject: Subject;
  showProgress?: boolean;
  onPress: () => void;
}

function SubjectCardComponent({ subject, showProgress = true, onPress }: SubjectCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      speed: 24,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      speed: 18,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${subject.title}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { backgroundColor: subject.color }]}
      >
        <View style={styles.iconWrap}>
          <Image source={subject.iconAsset} contentFit="cover" style={styles.iconImage} />
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {subject.title}
        </Text>
        <Text style={styles.topicCount}>{subject.topicCount} topics</Text>

        {showProgress ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${subject.progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{subject.progressPercent}%</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const SubjectCard = memo(SubjectCardComponent);

const styles = StyleSheet.create({
  cardWrap: {
    flex: 1,
  },
  card: {
    minHeight: 160,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  title: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  topicCount: {
    ...Typography.caption,
    color: Colors.primaryFixed,
  },
  progressWrap: {
    marginTop: 'auto',
    gap: Spacing.xs,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryDark,
  },
  progressText: {
    ...Typography.captionMedium,
    color: Colors.surfaceContainerLowest,
    textAlign: 'right',
  },
});
