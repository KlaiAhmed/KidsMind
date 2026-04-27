import { memo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { Subject } from '@/types/child';

interface SubjectProgressCardProps {
  subject: Subject;
  onPressCard: () => void;
  onPressContinue: () => void;
}

function getCtaLabel(progressPercent: number): string {
  if (progressPercent <= 0) {
    return 'Start';
  }

  if (progressPercent >= 100) {
    return 'Review';
  }

  return 'Continue';
}

function SubjectProgressCardComponent({
  subject,
  onPressCard,
  onPressContinue,
}: SubjectProgressCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const ctaLabel = getCtaLabel(subject.progressPercent);

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 25,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${subject.title} progress`}
        onPress={onPressCard}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <View style={[styles.iconWrap, { backgroundColor: subject.color }]}>
          <Image source={subject.iconAsset} contentFit="cover" style={styles.iconImage} />
        </View>

        <Text numberOfLines={1} style={styles.subjectTitle}>
          {subject.title}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(0, Math.min(100, subject.progressPercent))}%`,
                backgroundColor: subject.color,
              },
            ]}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.progressText}>{subject.progressPercent}% complete</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${ctaLabel} ${subject.title}`}
            onPress={onPressContinue}
            style={({ pressed }) => [styles.ctaButton, pressed ? styles.ctaButtonPressed : null]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.white} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const SubjectProgressCard = memo(SubjectProgressCardComponent);

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  subjectTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ctaButton: {
    minHeight: 56,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    ...Typography.captionMedium,
    color: Colors.white,
  },
});
