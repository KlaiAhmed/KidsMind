import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface StatTileBaseProps {
  title: string;
  value: string;
  subtitle: string;
}

interface ScreenTimeStatTileProps extends StatTileBaseProps {
  variant: 'screenTime';
  progress: number;
  accentColor?: string;
}

interface ExercisesStatTileProps extends StatTileBaseProps {
  variant: 'exercises';
  trendDirection?: 'up' | 'down';
}

interface AvgScoreStatTileProps extends StatTileBaseProps {
  variant: 'avgScore';
  bars: number[];
}

interface StreakStatTileProps extends StatTileBaseProps {
  variant: 'streak';
  isRecord?: boolean;
}

export type StatTileProps =
  | ScreenTimeStatTileProps
  | ExercisesStatTileProps
  | AvgScoreStatTileProps
  | StreakStatTileProps;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function MiniRing({ progress, color }: { progress: number; color: string }) {
  const segments = 18;
  const safeProgress = clamp(progress);
  const activeSegments = Math.round(safeProgress * segments);

  return (
    <View style={styles.ringShell}>
      {Array.from({ length: segments }).map((_, index) => {
        const rotation = (index * 360) / segments;
        const isActive = index < activeSegments;

        return (
          <View
            key={rotation}
            style={[
              styles.ringSegment,
              {
                transform: [{ rotate: `${rotation}deg` }, { translateY: -18 }],
                backgroundColor: isActive ? color : Colors.surfaceContainerHigh,
              },
            ]}
          />
        );
      })}

      <View style={styles.ringCenter}>
        <Text style={styles.ringPercent}>{Math.round(safeProgress * 100)}%</Text>
      </View>
    </View>
  );
}

function StatusPill({
  icon,
  iconColor,
  label,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
}) {
  return (
    <View style={styles.statusPill}>
      <Icon accessibilityLabel={label} color={iconColor} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.statusPillLabel}>
        {label}
      </Text>
    </View>
  );
}

export function StatTile(props: StatTileProps) {
  let visual: ReactNode = null;

  if (props.variant === 'screenTime') {
    visual = <MiniRing color={props.accentColor ?? Colors.primary} progress={props.progress} />;
  }

  if (props.variant === 'exercises') {
    visual = (
      <StatusPill
        icon={props.trendDirection === 'down' ? 'trending-down' : 'trending-up'}
        iconColor={props.trendDirection === 'down' ? Colors.accentAmber : Colors.success}
        label={props.trendDirection === 'down' ? 'Below yesterday' : 'Up from yesterday'}
      />
    );
  }

  if (props.variant === 'avgScore') {
    visual = (
      <View style={styles.barChart}>
        {props.bars.map((barHeight, index) => (
          <View
            key={`bar-${index}`}
            style={[
              styles.chartBar,
              {
                height: barHeight,
                backgroundColor:
                  index === props.bars.length - 1 ? Colors.primary : Colors.primaryFixed,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (props.variant === 'streak') {
    visual = (
      <View style={styles.streakVisual}>
        <Icon accessibilityLabel="Streak flame" color={Colors.accentAmber} name="fire" size={22} />
        <Icon accessibilityLabel="Streak trophy" color={Colors.primary} name="trophy-outline" size={20} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{props.title}</Text>
        {visual}
      </View>

      <Text style={styles.value}>{props.value}</Text>
      <Text style={styles.subtitle}>{props.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 152,
    width: 176,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1,
  },
  value: {
    ...Typography.title,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ringShell: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSegment: {
    position: 'absolute',
    width: 5,
    height: 10,
    borderRadius: Radii.full,
  },
  ringCenter: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    ...Typography.label,
    color: Colors.text,
    letterSpacing: 0,
  },
  statusPill: {
    maxWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 40,
  },
  chartBar: {
    width: 8,
    borderRadius: Radii.full,
  },
  streakVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
