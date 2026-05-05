import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Radii, Spacing, Typography, Shadows } from '@/constants/theme';

export interface DailyUsagePoint {
  date: string; // ISO date
  messages: number;
}

interface ActivityBarChartProps {
  data?: DailyUsagePoint[];
  loading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ActivityBarChart({ data = [], loading }: ActivityBarChartProps) {
  const chartWidth = Math.min(760, screenWidth - Spacing.md * 2);
  const chartHeight = 120;
  const padding = 8;
  const barGap = 8;
  const items = data.slice(-7);

  if (loading) {
    return (
      <View style={[styles.card, styles.skeletonCard]}>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRowShort} />
      </View>
    );
  }

  if (!items || items.length === 0 || items.every((d) => d.messages === 0)) {
    return (
      <View style={styles.card}>
        <Text style={styles.noActivity}>No activity this week</Text>
      </View>
    );
  }

  const maxMessages = Math.max(...items.map((d) => d.messages), 1);
  const barCount = items.length;
  const usableWidth = chartWidth - padding * 2 - barGap * (barCount - 1);
  const barWidth = Math.max(6, Math.floor(usableWidth / barCount));

  const guides = 3;

  return (
    <View style={styles.card}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* horizontal guide lines */}
        {[...Array(guides)].map((_, i) => {
          const y = padding + (i * (chartHeight - padding * 2)) / (guides - 1);
          return <Line key={`g-${i}`} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke={Colors.outline} strokeWidth={0.5} />;
        })}

        {/* bars */}
        {items.map((point, idx) => {
          const x = padding + idx * (barWidth + barGap);
          const heightRatio = Math.max(0, point.messages / maxMessages);
          const barH = Math.max(2, Math.round((chartHeight - padding * 2) * heightRatio));
          const y = chartHeight - padding - barH - 18; // leave room for labels

          const isZero = point.messages === 0;

          return (
            <React.Fragment key={`${point.date}-${idx}`}>
              <Rect x={x} y={y} width={barWidth} height={isZero ? 2 : barH} rx={4} fill={isZero ? Colors.outline : Colors.primary} />
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 6}
                fontSize={10}
                fill={Colors.textTertiary}
                textAnchor="middle"
              >
                {new Date(point.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    ...Shadows.card,
  },
  skeletonCard: {
    height: 120,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  skeletonRow: {
    height: 16,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    width: '90%',
  },
  skeletonRowShort: {
    height: 12,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    width: '60%',
  },
  noActivity: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
