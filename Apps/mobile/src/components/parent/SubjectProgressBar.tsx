import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export interface SubjectProgressBarProps {
  label: string;
  progress: number;
  valueLabel: string;
  fillColor: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function SubjectProgressBar({
  label,
  progress,
  valueLabel,
  fillColor,
}: SubjectProgressBarProps) {
  const safeProgress = clamp(progress);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueLabel}</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${safeProgress * 100}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  value: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  track: {
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
  },
});
