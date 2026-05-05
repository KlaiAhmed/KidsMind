import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { SkeletonBlock } from '@/src/components/parent/ParentDashboardStates';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TrendDirection = 'up' | 'down' | 'flat';
type AnimationMode = 'timing' | 'spring';

export interface SevenDayActivityPoint {
  key: string;
  label: string;
  sessions: number;
  isToday: boolean;
}

interface AnimatedNumberTextProps {
  target: number;
  formatter?: (value: number) => string;
  style: StyleProp<TextStyle>;
  duration?: number;
  delay?: number;
  mode?: AnimationMode;
  springConfig?: {
    damping: number;
    stiffness: number;
  };
}

interface SegmentedRingProps {
  progress: number;
  size: number;
  thickness: number;
  segments: number;
  fillColor: string;
  trackColor: string;
  duration: number;
  center?: ReactNode;
}

interface ScreenTimeMetricCardProps {
  usedMinutes: number;
}

interface ExercisesMetricCardProps {
  count: number;
  deltaFromYesterday: number;
}

interface AverageScoreMetricCardProps {
  averageScore: number | null;
  trendScores: (number | null)[];
}

interface DailyStreakMetricCardProps {
  streakDays: number;
  isPersonalRecord: boolean;
}

interface DailyUsageDonutCardProps {
  todayMinutes: number;
  sevenDayAverageMinutes: number;
  loading?: boolean;
  errorMessage?: string | null;
  isEmpty?: boolean;
}

interface MiniScoreBarProps {
  score: number | null;
  index: number;
}

interface ActivityBarProps {
  index: number;
  point: SevenDayActivityPoint;
  maxSessions: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function useAnimatedScalar(
  target: number,
  {
    delay = 0,
    duration = 600,
    mode = 'timing',
    springConfig = { damping: 12, stiffness: 400 },
  }: {
    delay?: number;
    duration?: number;
    mode?: AnimationMode;
    springConfig?: {
      damping: number;
      stiffness: number;
    };
  } = {},
): number {
  const value = useSharedValue(0);
  const [renderedValue, setRenderedValue] = useState(0);
  const safeTarget = Number.isFinite(target) ? target : 0;
  const damping = springConfig.damping;
  const stiffness = springConfig.stiffness;

  useEffect(() => {
    value.value = 0;
    const animation =
      mode === 'spring'
        ? withSpring(safeTarget, { damping, stiffness })
        : withTiming(safeTarget, {
            duration,
            easing: Easing.out(Easing.cubic),
          });

    value.value = delay > 0 ? withDelay(delay, animation) : animation;
  }, [damping, delay, duration, mode, safeTarget, stiffness, value]);

  useAnimatedReaction(
    () => value.value,
    (current) => {
      runOnJS(setRenderedValue)(current);
    },
  );

  return renderedValue;
}

function AnimatedNumberText({
  target,
  formatter = (value) => `${Math.round(value)}`,
  style,
  duration = 600,
  delay = 0,
  mode = 'timing',
  springConfig,
}: AnimatedNumberTextProps) {
  const value = useAnimatedScalar(target, { delay, duration, mode, springConfig });

  return <Text style={style}>{formatter(value)}</Text>;
}

function formatMinutesCompact(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) {
    return `${remainder}m`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

function getDeltaColor(todayMinutes: number, averageMinutes: number): string {
  if (averageMinutes <= 0) {
    return Colors.textSecondary;
  }

  const ratio = todayMinutes / averageMinutes;

  if (ratio >= 1) {
    return Colors.success;
  }

  if (ratio >= 0.5) {
    return Colors.accentAmber;
  }

  return Colors.textSecondary;
}

function getTrend(direction: TrendDirection): {
  color: string;
  icon: IconName;
} {
  if (direction === 'up') {
    return {
      color: Colors.success,
      icon: 'arrow-up',
    };
  }

  if (direction === 'down') {
    return {
      color: Colors.error,
      icon: 'arrow-down',
    };
  }

  return {
    color: Colors.textSecondary,
    icon: 'minus',
  };
}

function MetricCard({
  children,
  icon,
  iconColor,
  title,
}: {
  children: ReactNode;
  icon: IconName;
  iconColor: string;
  title: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTitleRow}>
        <Text numberOfLines={1} style={styles.metricTitle}>
          {title}
        </Text>
        <MaterialCommunityIcons color={iconColor} name={icon} size={20} />
      </View>

      {children}
    </View>
  );
}

function SegmentedRing({
  center,
  duration,
  fillColor,
  progress,
  segments,
  size,
  thickness,
  trackColor,
}: SegmentedRingProps) {
  const animatedProgress = useAnimatedScalar(clamp(progress), { duration });
  const radius = size / 2 - thickness / 2;
  const circumference = Math.PI * (size - thickness);
  const segmentWidth = Math.max(Spacing.xs, (circumference / segments) * 0.62);
  const centerSize = Math.max(0, size - (thickness + Spacing.sm) * 2);

  return (
    <View style={[styles.segmentedRing, { width: size, height: size }]}>
      {Array.from({ length: segments }).map((_, index) => {
        const rotation = (index * 360) / segments;
        const isActive = progress > 0 && (index + 1) / segments <= animatedProgress;

        return (
          <View
            key={`ring-${segments}-${index}`}
            style={[
              styles.ringSegment,
              {
                width: segmentWidth,
                height: thickness,
                left: size / 2 - segmentWidth / 2,
                top: size / 2 - thickness / 2,
                backgroundColor: isActive ? fillColor : trackColor,
                transform: [{ rotate: `${rotation}deg` }, { translateY: -radius }],
              },
            ]}
          />
        );
      })}

      {center ? (
        <View
          style={[
            styles.ringCenter,
            {
              width: centerSize,
              height: centerSize,
            },
          ]}
        >
          {center}
        </View>
      ) : null}
    </View>
  );
}

function DelayedFadeIn({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(
      600,
      withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [opacity]);

  return <Animated.View style={[styles.trendRow, animatedStyle]}>{children}</Animated.View>;
}

function MiniScoreBar({ index, score }: MiniScoreBarProps) {
  const chartHeight = Spacing.xxl;
  const minimumHeight = Spacing.sm;
  const targetHeight = score == null ? minimumHeight : Math.max(minimumHeight, (clamp(score, 0, 100) / 100) * chartHeight);
  const height = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  useEffect(() => {
    height.value = 0;
    height.value = withDelay(
      index * 50,
      withTiming(targetHeight, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [height, index, targetHeight]);

  const barColor = useMemo(() => {
    if (score == null) {
      return Colors.surfaceContainerHigh;
    }

    if (score >= 85) {
      return Colors.primary;
    }

    if (score >= 70) {
      return `${Colors.primary}CC`;
    }

    if (score >= 50) {
      return `${Colors.primary}99`;
    }

    return `${Colors.primary}66`;
  }, [score]);

  return <Animated.View style={[styles.miniScoreBar, { backgroundColor: barColor }, animatedStyle]} />;
}

function MiniScoreBarChart({ scores }: { scores: (number | null)[] }) {
  return (
    <View style={styles.miniScoreChart}>
      {scores.map((score, index) => (
        <MiniScoreBar key={`score-${index}`} index={index} score={score} />
      ))}
    </View>
  );
}

function ActivityBar({ index, maxSessions, point }: ActivityBarProps) {
  const chartHeight = Spacing.xxl + Spacing.xxl + Spacing.lg;
  const minimumHeight = Spacing.sm;
  const targetHeight =
    point.sessions > 0 ? Math.max(minimumHeight, (point.sessions / maxSessions) * chartHeight) : minimumHeight;
  const height = useSharedValue(0);
  const hasAnimated = useRef(false);
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  useEffect(() => {
    if (hasAnimated.current) {
      height.value = targetHeight;
      return;
    }

    hasAnimated.current = true;
    height.value = 0;
    height.value = withDelay(
      index * 40,
      withTiming(targetHeight, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [height, index, targetHeight]);

  return (
    <View style={styles.activityColumn}>
      <AnimatedNumberText
        duration={600}
        formatter={(value) => `${Math.round(value)}`}
        style={styles.activityCount}
        target={point.sessions}
      />
      <View style={styles.activityBarTrack}>
        <Animated.View
          style={[
            styles.activityBar,
            {
              backgroundColor:
                point.sessions > 0
                  ? point.isToday
                    ? Colors.primary
                    : `${Colors.primary}D9`
                  : Colors.surfaceContainerHigh,
            },
            animatedStyle,
          ]}
        />
      </View>
      <View style={styles.activityLabelBlock}>
        <Text numberOfLines={1} style={[styles.activityLabel, point.isToday ? styles.activityLabelToday : null]}>
          {point.label}
        </Text>
        <Text numberOfLines={1} style={styles.activityTodayLabel}>
          {point.isToday ? 'Tdy' : ' '}
        </Text>
      </View>
    </View>
  );
}

export function ScreenTimeMetricCard({ usedMinutes }: ScreenTimeMetricCardProps) {
  const progress = usedMinutes / Math.max(usedMinutes, 60);

  return (
    <MetricCard icon="clock-outline" iconColor={Colors.primary} title="SCREEN TIME TODAY">
      <View style={styles.metricValueRow}>
        <View style={styles.metricCopy}>
          <AnimatedNumberText
            formatter={formatMinutesCompact}
            style={styles.metricValue}
            target={usedMinutes}
          />
          <Text style={styles.metricSecondary}>Tutoring time today</Text>
        </View>

        <SegmentedRing
          duration={800}
          fillColor={Colors.primary}
          progress={progress}
          segments={28}
          size={Spacing.xxl + Spacing.sm}
          thickness={Spacing.xs + Spacing.xs / 2}
          trackColor={Colors.surfaceContainerHigh}
        />
      </View>
    </MetricCard>
  );
}

export function ExercisesMetricCard({ count, deltaFromYesterday }: ExercisesMetricCardProps) {
  const direction: TrendDirection = deltaFromYesterday > 0 ? 'up' : deltaFromYesterday < 0 ? 'down' : 'flat';
  const trend = getTrend(direction);
  const trendLabel =
    direction === 'up'
      ? `+${deltaFromYesterday} from yesterday`
      : direction === 'down'
        ? `${deltaFromYesterday} from yesterday`
        : '+0 from yesterday';

  return (
    <MetricCard icon="book-open-variant" iconColor={Colors.primary} title="EXERCISES">
      <AnimatedNumberText formatter={(value) => `${Math.round(value)}`} style={styles.metricValue} target={count} />
      <DelayedFadeIn>
        <MaterialCommunityIcons color={trend.color} name={trend.icon} size={16} />
        <Text style={[styles.metricSecondary, { color: trend.color }]}>{trendLabel}</Text>
      </DelayedFadeIn>
    </MetricCard>
  );
}

export function AverageScoreMetricCard({ averageScore, trendScores }: AverageScoreMetricCardProps) {
  return (
    <MetricCard icon="star-circle-outline" iconColor={Colors.accentAmber} title="AVG SCORE">
      <View style={styles.scoreContent}>
        <View style={styles.metricCopy}>
          {averageScore == null ? (
            <Text style={styles.metricValue}>—</Text>
          ) : (
            <AnimatedNumberText
              formatter={(value) => `${Math.round(value)}%`}
              style={styles.metricValue}
              target={averageScore}
            />
          )}
          <Text style={styles.metricSecondary}>
            {averageScore == null ? 'Scores will appear here' : 'Quiz score trend'}
          </Text>
        </View>
        <MiniScoreBarChart scores={trendScores} />
      </View>
    </MetricCard>
  );
}

export function DailyStreakMetricCard({ isPersonalRecord, streakDays }: DailyStreakMetricCardProps) {
  const scale = useSharedValue(0.92);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 400,
    });
  }, [scale]);

  return (
    <MetricCard icon="fire" iconColor={Colors.accentAmber} title="DAILY STREAK">
      <View style={styles.metricValueRow}>
        <View style={styles.metricCopy}>
          <Animated.View style={animatedStyle}>
            <AnimatedNumberText
              formatter={(value) => `${Math.round(value)} Days`}
              mode="spring"
              springConfig={{ damping: 12, stiffness: 400 }}
              style={styles.metricValue}
              target={streakDays}
            />
          </Animated.View>
          {isPersonalRecord ? <Text style={styles.metricSecondary}>Personal Record!</Text> : null}
        </View>

        {isPersonalRecord ? (
          <View style={styles.trophyShell}>
            <MaterialCommunityIcons color={Colors.accentAmber} name="trophy-outline" size={20} />
          </View>
        ) : null}
      </View>
    </MetricCard>
  );
}

export function DailyUsageDonutCard({
  errorMessage,
  isEmpty = false,
  loading = false,
  sevenDayAverageMinutes,
  todayMinutes,
}: DailyUsageDonutCardProps) {
  const hasError = Boolean(errorMessage?.trim());
  const isLoading = loading && !hasError;
  const isEmptyState = !isLoading && !hasError && isEmpty;
  const progress = todayMinutes / Math.max(todayMinutes, sevenDayAverageMinutes, 1);
  const averageColor = getDeltaColor(todayMinutes, sevenDayAverageMinutes);
  const donutSize = Spacing.xxl * 4 + Spacing.sm;
  const donutThickness = Spacing.md + Spacing.xs / 2;

  return (
    <View style={styles.usageCard}>
      <Text style={styles.usageTitle}>7-Day Activity</Text>

      {hasError ? (
        <View style={styles.usageErrorState}>
          <MaterialCommunityIcons color={Colors.textSecondary} name="alert-circle-outline" size={18} />
          <Text style={styles.usageErrorText}>{errorMessage}</Text>
        </View>
      ) : (
        <>
          <View style={styles.donutWrap}>
            <SegmentedRing
              center={
                isLoading ? (
                  <View style={styles.donutLoadingCopy}>
                    <SkeletonBlock style={styles.donutLoadingValue} />
                    <SkeletonBlock style={styles.donutLoadingLabel} />
                  </View>
                ) : (
                  <View style={styles.donutCenterCopy}>
                    <AnimatedNumberText
                      duration={600}
                      formatter={(value) => `${Math.round(value)}`}
                      style={styles.donutValue}
                      target={todayMinutes}
                    />
                    <Text style={styles.donutLabel}>{isEmptyState ? 'No activity yet' : 'MINUTES TODAY'}</Text>
                  </View>
                )
              }
              duration={1000}
              fillColor={Colors.primary}
              progress={isLoading ? 0 : progress}
              segments={72}
              size={donutSize}
              thickness={donutThickness}
              trackColor={Colors.surfaceContainerHigh}
            />
          </View>

          <View style={styles.usageStatsRow}>
            {isLoading ? (
              <>
                <View style={styles.usageStat}>
                  <SkeletonBlock style={styles.usageStatSkeletonLabel} />
                  <SkeletonBlock style={styles.usageStatSkeletonValue} />
                </View>

                <View style={styles.usageDivider} />

                <View style={styles.usageStat}>
                  <SkeletonBlock style={styles.usageStatSkeletonLabel} />
                  <SkeletonBlock style={styles.usageStatSkeletonValue} />
                </View>
              </>
            ) : (
              <>
                <View style={styles.usageStat}>
                  <Text style={styles.usageStatLabel}>Today</Text>
                  <AnimatedNumberText
                    formatter={(value) => `${Math.round(value)}m`}
                    style={styles.usageStatValue}
                    target={todayMinutes}
                  />
                </View>

                <View style={styles.usageDivider} />

                <View style={styles.usageStat}>
                  <Text style={styles.usageStatLabel}>7-day avg</Text>
                  <AnimatedNumberText
                    formatter={(value) => `${Math.round(value)}m`}
                    style={[styles.usageStatValue, { color: averageColor }]}
                    target={sevenDayAverageMinutes}
                  />
                </View>
              </>
            )}
          </View>

          {isEmptyState ? <Text style={styles.usageEmptyHint}>No activity yet</Text> : null}
        </>
      )}
    </View>
  );
}

export function SevenDayActivityChart({
  errorMessage,
  loading = false,
  series,
}: {
  errorMessage?: string | null;
  loading?: boolean;
  series: SevenDayActivityPoint[];
}) {
  const { width } = useWindowDimensions();
  const maxSessions = Math.max(...series.map((point) => point.sessions), 1);
  const chartMinWidth = Spacing.xxl * 7;
  const shouldScroll = width < chartMinWidth + Spacing.xl;
  const isEmpty = series.length === 0 || series.every((point) => point.sessions === 0);

  if (errorMessage?.trim()) {
    return (
      <View style={styles.activityState}>
        <MaterialCommunityIcons color={Colors.textSecondary} name="alert-circle-outline" size={18} />
        <Text style={styles.activityStateText}>{errorMessage}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.activityLoadingState}>
        <View style={styles.activityLoadingBars}>
          {Array.from({ length: 7 }).map((_, index) => (
            <View key={`loading-bar-${index}`} style={styles.activityLoadingColumn}>
              <SkeletonBlock style={styles.activityLoadingCount} />
              <SkeletonBlock style={[styles.activityLoadingBar, { height: Spacing.xxl + index * 2 }]} />
              <SkeletonBlock style={styles.activityLoadingLabel} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.activityState}>
        <MaterialCommunityIcons color={Colors.textSecondary} name="chart-bar" size={18} />
        <Text style={styles.activityStateText}>No activity in the last 7 days.</Text>
      </View>
    );
  }

  const chart = (
    <View style={[styles.activityGrid, shouldScroll ? { width: chartMinWidth } : null]}>
      {series.map((point, index) => (
        <ActivityBar key={point.key} index={index} maxSessions={maxSessions} point={point} />
      ))}
    </View>
  );

  if (shouldScroll) {
    return (
      <ScrollView
        contentContainerStyle={styles.activityScroller}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {chart}
      </ScrollView>
    );
  }

  return chart;
}

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    minHeight: Spacing.xxxl + Spacing.xxl + Spacing.xl + Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metricTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1,
  },
  metricValueRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metricCopy: {
    flex: 1,
    minWidth: Spacing.xxl,
    gap: Spacing.xs,
  },
  metricValue: {
    ...Typography.headline,
    color: Colors.text,
  },
  metricSecondary: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  segmentedRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSegment: {
    position: 'absolute',
    borderRadius: Radii.full,
  },
  ringCenter: {
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoreContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  miniScoreChart: {
    height: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  miniScoreBar: {
    flex: 1,
    minWidth: Spacing.xs + Spacing.xs / 2,
    borderRadius: Radii.full,
  },
  trophyShell: {
    width: Spacing.xl + Spacing.xs,
    height: Spacing.xl + Spacing.xs,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  usageCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: Spacing.xxxl + Spacing.xxl + Spacing.xl + Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  usageErrorState: {
    minHeight: Spacing.xxl + Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  usageErrorText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  donutLoadingCopy: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  donutLoadingValue: {
    width: 52,
    height: 24,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  donutLoadingLabel: {
    width: 88,
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  usageEmptyHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  usageStatSkeletonLabel: {
    width: 48,
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  usageStatSkeletonValue: {
    width: 56,
    height: 22,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  usageTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterCopy: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  donutValue: {
    ...Typography.headline,
    color: Colors.text,
  },
  donutLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  usageStatsRow: {
    minHeight: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  usageStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 0,
  },
  usageStatLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  usageStatValue: {
    ...Typography.title,
    color: Colors.text,
  },
  usageDivider: {
    width: Spacing.xs / 2,
    height: Spacing.xl + Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: `${Colors.outlineVariant}26`,
  },
  activityScroller: {
    paddingBottom: Spacing.xs,
  },
  activityGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  activityColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 0,
  },
  activityCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  activityBarTrack: {
    height: Spacing.xxl + Spacing.xxl + Spacing.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  activityBar: {
    width: '100%',
    borderRadius: 0,
  },
  activityLabelBlock: {
    minHeight: Spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  activityLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activityLabelToday: {
    color: Colors.primary,
  },
  activityTodayLabel: {
    ...Typography.caption,
    color: Colors.primary,
    textAlign: 'center',
  },
  activityState: {
    minHeight: Spacing.xxl + Spacing.xxl + Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  activityStateText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activityLoadingState: {
    minHeight: Spacing.xxl + Spacing.xxl + Spacing.lg,
    justifyContent: 'center',
  },
  activityLoadingBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  activityLoadingColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 0,
  },
  activityLoadingCount: {
    width: 12,
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  activityLoadingBar: {
    width: '100%',
    borderRadius: 0,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  activityLoadingLabel: {
    width: 12,
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
