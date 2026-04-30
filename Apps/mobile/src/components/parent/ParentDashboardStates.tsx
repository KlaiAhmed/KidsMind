import { useEffect, useRef, type ComponentProps } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Gradients, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { toApiErrorMessage } from '@/contexts/AuthContext';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
}

interface EmptyStateProps {
  actionLabel?: string;
  compact?: boolean;
  iconName: IconName;
  onAction?: () => void;
  subtitle: string;
  title: string;
}

interface ErrorStateProps {
  error?: unknown;
  iconName?: IconName;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  title: string;
}

interface ErrorCardProps {
  error?: unknown;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  title?: string;
}

export function SkeletonBlock({ style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return <Animated.View pointerEvents="none" style={[styles.skeletonBlock, style, { opacity }]} />;
}

export function ParentDashboardEmptyState({
  actionLabel,
  compact = false,
  iconName,
  onAction,
  subtitle,
  title,
}: EmptyStateProps) {
  return (
    <View style={[styles.emptyState, compact ? styles.compactState : null]}>
      <View style={styles.iconShell}>
        <MaterialCommunityIcons color={Colors.primary} name={iconName} size={compact ? 24 : 34} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.primaryAction, pressed ? styles.pressed : null]}
        >
          <LinearGradient
            colors={[...Gradients.indigoDepth.colors]}
            end={Gradients.indigoDepth.end}
            start={Gradients.indigoDepth.start}
            style={styles.primaryActionGradient}
          >
            <Text style={styles.primaryActionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ParentDashboardErrorState({
  error,
  iconName = 'alert-circle-outline',
  message,
  onRetry,
  retryLabel = 'Retry',
  title,
}: ErrorStateProps) {
  return (
    <View style={styles.errorState}>
      <MaterialCommunityIcons color={Colors.errorText} name={iconName} size={36} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{message ?? toApiErrorMessage(error)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.retryLabel}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

export function ErrorCard({
  error,
  message,
  onRetry,
  retryLabel = 'Retry',
  title = 'Something went wrong',
}: ErrorCardProps) {
  return (
    <View style={styles.errorCard}>
      <MaterialCommunityIcons color={Colors.errorText} name="alert-circle-outline" size={18} />
      <View style={styles.errorCardCopy}>
        <Text style={styles.errorCardTitle}>{title}</Text>
        <Text style={styles.errorCardText}>{message ?? toApiErrorMessage(error)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={onRetry}>
          <Text style={styles.errorCardAction}>{retryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBlock: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  compactState: {
    flex: 0,
    paddingVertical: Spacing.md,
  },
  iconShell: {
    width: 54,
    height: 54,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  emptyTitle: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    ...Shadows.button,
  },
  primaryActionGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primaryActionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 144,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  retryLabel: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  errorCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.errorContainer,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  errorCardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  errorCardTitle: {
    ...Typography.captionMedium,
    color: Colors.errorText,
  },
  errorCardText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
  errorCardAction: {
    ...Typography.captionMedium,
    color: Colors.errorText,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
