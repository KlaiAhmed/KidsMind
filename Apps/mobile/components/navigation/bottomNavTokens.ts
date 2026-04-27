import { Colors, Radii, Sizing, Spacing } from '@/constants/theme';

export const BottomNavTokens = {
  colors: {
    container: Colors.surfaceContainerLowest,
    active: Colors.primary,
    inactive: Colors.textTertiary,
    disabled: Colors.outlineVariant,
    shadow: Colors.text,
  },
  radius: {
    container: Radii.xxl,
  },
  spacing: {
    outerHorizontal: Spacing.md,
    outerTop: Spacing.sm,
    minBottomOffset: Spacing.sm,
    containerHorizontal: Spacing.sm,
    containerVertical: 6,
    itemHorizontal: 4,
    itemVertical: 6,
    iconLabelGap: 4,
  },
  size: {
    icon: 20,
    minTapTarget: Sizing.minTapTarget,
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    activeFontFamily: 'Inter_600SemiBold',
    inactiveFontFamily: 'Inter_400Regular',
  },
  opacity: {
    pressed: 0.8,
    disabled: 0.48,
  },
  shadow: {
    shadowColor: '#111A2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 14,
  },
} as const;

const CHILD_TAB_ICON_WRAP_HEIGHT = BottomNavTokens.size.icon + 4;

export function getChildTabSceneBottomPadding(bottomInset: number): number {
  const safeBottomInset = Math.max(bottomInset, BottomNavTokens.spacing.minBottomOffset);

  return (
    safeBottomInset +
    BottomNavTokens.spacing.outerTop +
    BottomNavTokens.spacing.containerVertical * 2 +
    BottomNavTokens.spacing.itemVertical * 2 +
    CHILD_TAB_ICON_WRAP_HEIGHT +
    BottomNavTokens.spacing.iconLabelGap +
    BottomNavTokens.text.lineHeight
  );
}
