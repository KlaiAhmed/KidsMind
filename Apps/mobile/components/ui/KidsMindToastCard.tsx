import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface KidsMindToastCardProps {
  variant: ToastVariant;
  isVisible: boolean;
  title: string;
  message?: string;
  colorScheme: 'light' | 'dark';
  iconName?: IconName | null;
}

interface VariantMeta {
  label: string;
  icon: IconName;
}

interface ToastPalette {
  card: string;
  title: string;
  message: string;
  meta: string;
  shadow: string;
  accent: string;
  iconBackground: string;
  iconColor: string;
}

const VARIANT_META: Record<ToastVariant, VariantMeta> = {
  success: {
    label: 'Success',
    icon: 'check-circle-outline',
  },
  error: {
    label: 'Error',
    icon: 'alert-circle-outline',
  },
  warning: {
    label: 'Warning',
    icon: 'alert-outline',
  },
  info: {
    label: 'Info',
    icon: 'information-outline',
  },
};

function resolvePalette(variant: ToastVariant, colorScheme: 'light' | 'dark'): ToastPalette {
  const isDark = colorScheme === 'dark';

  const base = {
    card: isDark ? '#20223A' : Colors.surfaceContainerLowest,
    title: isDark ? '#F6F4FF' : Colors.text,
    message: isDark ? '#CDC8EA' : Colors.textSecondary,
    meta: isDark ? '#ABA4D3' : Colors.textSecondary,
    shadow: isDark ? '#0B0E19' : '#1A1A2E',
  };

  const variantMap: Record<ToastVariant, Pick<ToastPalette, 'accent' | 'iconBackground' | 'iconColor'>> = isDark
    ? {
      success: {
        accent: '#4EE0A8',
        iconBackground: '#1C4A3E',
        iconColor: '#9BF8D2',
      },
      error: {
        accent: '#FF8CA0',
        iconBackground: '#4F2432',
        iconColor: '#FFD1DB',
      },
      warning: {
        accent: '#FFD885',
        iconBackground: '#4D3E18',
        iconColor: '#FFE9B4',
      },
      info: {
        accent: '#A79AFF',
        iconBackground: '#322D6B',
        iconColor: '#DCD5FF',
      },
    }
    : {
      success: {
        accent: Colors.success,
        iconBackground: '#DFF8EE',
        iconColor: '#067B56',
      },
      error: {
        accent: Colors.tertiary,
        iconBackground: '#FFE8EE',
        iconColor: '#B5344A',
      },
      warning: {
        accent: Colors.secondaryContainer,
        iconBackground: '#FFF2CF',
        iconColor: '#956B00',
      },
      info: {
        accent: Colors.primary,
        iconBackground: '#E8E3FF',
        iconColor: '#3427BC',
      },
    };

  return {
    ...base,
    ...variantMap[variant],
  };
}

export function KidsMindToastCard({
  variant,
  isVisible,
  title,
  message,
  colorScheme,
  iconName,
}: KidsMindToastCardProps) {
  const revealProgress = useSharedValue(isVisible ? 1 : 0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    revealProgress.value = withTiming(isVisible ? 1 : 0, {
      duration: isVisible ? 220 : 170,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });

    if (isVisible) {
      iconScale.value = withSequence(
        withTiming(1.06, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
        }),
      );
    }
  }, [iconScale, isVisible, revealProgress]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [
      {
        translateY: interpolate(revealProgress.value, [0, 1], [-10, 0]),
      },
      {
        scale: interpolate(revealProgress.value, [0, 1], [0.985, 1]),
      },
    ],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const meta = VARIANT_META[variant];
  const palette = resolvePalette(variant, colorScheme);
  const resolvedIconName = iconName === null ? null : iconName ?? meta.icon;
  const accessibilityLabel = message
    ? `${meta.label}. ${title}. ${message}`
    : `${meta.label}. ${title}`;

  return (
    <Animated.View style={[styles.wrapper, animatedCardStyle]}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.card,
          {
            backgroundColor: palette.card,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />

        {resolvedIconName ? (
          <Animated.View style={[styles.iconContainer, { backgroundColor: palette.iconBackground }, animatedIconStyle]}>
            <MaterialCommunityIcons color={palette.iconColor} name={resolvedIconName} size={18} />
          </Animated.View>
        ) : null}

        <View style={styles.content}>
          <Text numberOfLines={1} style={[styles.meta, { color: palette.meta }]}>
            {meta.label}
          </Text>
          <Text numberOfLines={2} style={[styles.title, { color: palette.title }]}>
            {title}
          </Text>
          {message ? (
            <Text numberOfLines={3} style={[styles.message, { color: palette.message }]}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderRadius: Radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0,
    shadowRadius: 18,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  accentBar: {
    width: 4,
    borderRadius: Radii.full,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    ...Typography.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  message: {
    ...Typography.caption,
    lineHeight: 19,
    marginTop: 2,
  },
});