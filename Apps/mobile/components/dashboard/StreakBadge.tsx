import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

const MIN_CHILD_TAP_TARGET = 56;

interface StreakBadgeProps {
  streakDays: number;
  onPress: () => void;
}

function StreakBadgeComponent({ streakDays, onPress }: StreakBadgeProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View streak details. Current streak ${streakDays} days`}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed ? styles.containerPressed : null]}
    >
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons name="fire" size={20} color={Colors.white} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.valueText}>{streakDays} day streak</Text>
        <Text style={styles.helperText}>Keep learning daily to grow your flame.</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
    </Pressable>
  );
}

export const StreakBadge = memo(StreakBadgeComponent);

const styles = StyleSheet.create({
  container: {
    minHeight: MIN_CHILD_TAP_TARGET,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  containerPressed: {
    transform: [{ scale: 0.98 }],
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  valueText: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
