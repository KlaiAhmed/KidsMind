// Apps/mobile/components/chat/SessionHeader.tsx
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

interface SessionHeaderProps {
  subjectName?: string;
  elapsedSeconds: number;
  minutesRemaining: number | null;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function SessionHeader({ subjectName, elapsedSeconds, minutesRemaining }: SessionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.primaryRow}>
        <View style={styles.subjectPill}>
          <MaterialCommunityIcons name="book-open-variant" size={16} color={Colors.primary} />
          <Text style={styles.subjectText}>{subjectName ?? 'Ask me anything!'}</Text>
        </View>

        <View style={styles.timerPill}>
          <MaterialCommunityIcons name="timer-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
        </View>
      </View>

      {minutesRemaining !== null && minutesRemaining <= 5 ? (
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons name="clock-alert-outline" size={16} color={Colors.secondary} />
          <Text style={styles.warningText}>You have {minutesRemaining} minutes left today.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  subjectPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 40,
  },
  subjectText: {
    ...Typography.captionMedium,
    color: Colors.text,
    flex: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 40,
  },
  timerText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.text,
  },
});
