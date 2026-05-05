import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import type { AuditEntry } from '@/types/child';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type AuditLogEntry = AuditEntry & {
  id?: string;
  description?: string | null;
};

function getAuditIconName(action: string): IconName {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes('pause')) {
    return 'pause-circle-outline';
  }

  if (normalizedAction.includes('resume')) {
    return 'play-circle-outline';
  }

  if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) {
    return 'trash-can-outline';
  }

  if (normalizedAction.includes('time') || normalizedAction.includes('limit') || normalizedAction.includes('window')) {
    return 'clock-outline';
  }

  if (normalizedAction.includes('subject') || normalizedAction.includes('learning')) {
    return 'school-outline';
  }

  if (normalizedAction.includes('notification') || normalizedAction.includes('alert')) {
    return 'bell-outline';
  }

  if (normalizedAction.includes('privacy') || normalizedAction.includes('content')) {
    return 'shield-lock-outline';
  }

  if (normalizedAction.includes('profile') || normalizedAction.includes('child')) {
    return 'account-child-outline';
  }

  return 'clipboard-text-clock-outline';
}

function formatFallbackRelativeTime(amount: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year'): string {
  if (amount === 0) {
    return 'just now';
  }

  const absoluteAmount = Math.abs(amount);
  const unitLabel = absoluteAmount === 1 ? unit : `${unit}s`;

  return amount < 0 ? `${absoluteAmount} ${unitLabel} ago` : `in ${absoluteAmount} ${unitLabel}`;
}

function getRelativeTimeFormatter(): Intl.RelativeTimeFormat | null {
  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat !== 'function') {
    return null;
  }

  try {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  } catch {
    return null;
  }
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown time';
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'Unknown time';
  }

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const rtf = getRelativeTimeFormatter();

  if (absoluteSeconds < 60) {
    return rtf ? rtf.format(diffSeconds, 'second') : formatFallbackRelativeTime(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf ? rtf.format(diffMinutes, 'minute') : formatFallbackRelativeTime(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf ? rtf.format(diffHours, 'hour') : formatFallbackRelativeTime(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return rtf ? rtf.format(diffDays, 'day') : formatFallbackRelativeTime(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return rtf ? rtf.format(diffMonths, 'month') : formatFallbackRelativeTime(diffMonths, 'month');
  }

  const diffYears = Math.round(diffMonths / 12);
  return rtf ? rtf.format(diffYears, 'year') : formatFallbackRelativeTime(diffYears, 'year');
}

export function getAuditLogDescription(entry: AuditLogEntry): string {
  return entry.description?.trim() || entry.details?.trim() || entry.action;
}

export function getAuditLogKey(entry: AuditLogEntry, index: number): string {
  return entry.id ?? `${entry.action}-${entry.timestamp ?? 'unknown'}-${index}`;
}

export function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons color={Colors.primary} name={getAuditIconName(entry.action)} size={18} />
      </View>
      <Text numberOfLines={2} style={styles.description}>
        {getAuditLogDescription(entry)}
      </Text>
      <Text numberOfLines={1} style={styles.timestamp}>
        {formatRelativeTime(entry.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    flex: 1,
    ...Typography.captionMedium,
    color: Colors.text,
  },
  timestamp: {
    maxWidth: 92,
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
