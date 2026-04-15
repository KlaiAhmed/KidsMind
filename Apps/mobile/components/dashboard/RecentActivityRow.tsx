import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { RecentActivity } from '@/types/child';

interface RecentActivityRowProps {
  activity: RecentActivity;
  subjectTitle: string;
  onPress: () => void;
}

function getRelativeTime(isoDate: string): string {
  const deltaMinutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60))
  );

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function RecentActivityRowComponent({
  activity,
  subjectTitle,
  onPress,
}: RecentActivityRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${activity.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Image source={activity.thumbnailAsset} contentFit="cover" style={styles.thumbnail} />

      <View style={styles.textBlock}>
        <Text numberOfLines={2} style={styles.title}>
          {activity.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.subjectTag}>
            <Text style={styles.subjectTagText}>{subjectTitle}</Text>
          </View>
          <Text style={styles.timeText}>{getRelativeTime(activity.completedAt)}</Text>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
    </Pressable>
  );
}

export const RecentActivityRow = memo(RecentActivityRowComponent);

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    padding: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: {
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  subjectTag: {
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  subjectTagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  timeText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
