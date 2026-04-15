import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { Topic } from '@/types/child';

interface TopicTileProps {
  topic: Topic;
  subjectTitle: string;
  onPress: () => void;
}

function TopicTileComponent({ topic, subjectTitle, onPress }: TopicTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open topic ${topic.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Image source={topic.thumbnailAsset} contentFit="cover" style={styles.thumbnail} />

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {topic.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.subjectTag}>
            <Text style={styles.subjectText}>{subjectTitle}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{topic.duration} min</Text>
          </View>
          {topic.difficulty ? <Text style={styles.difficultyText}>{topic.difficulty}</Text> : null}
        </View>
      </View>

      {topic.isCompleted ? (
        <MaterialCommunityIcons name="check-circle" size={22} color={Colors.success} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
      )}
    </Pressable>
  );
}

export const TopicTile = memo(TopicTileComponent);

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowPressed: {
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radii.md,
  },
  content: {
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
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  subjectTag: {
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  subjectText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  durationBadge: {
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  durationText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  difficultyText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
});
