/**
 * ChildSpaceHeader Component
 *
 * Wrapper for child space screens that adds:
 * - Controls/settings icon for parent access (top-right)
 *
 * Security: This component enforces that children cannot access
 * parent space without entering the correct parent PIN.
 *
 * Usage: Wrap every child space screen with this component.
 */

import { useCallback } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Colors, Radii, Sizing, Spacing } from '@/constants/theme';
import { useChildSpaceBoundary } from '@/src/components/spaceSwitch/ChildSpaceBoundary';

interface ChildSpaceHeaderProps {
  avatarSource: ImageSourcePropType;
  childName: string;
  welcomeLabel?: string;
  greetingText?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function ChildSpaceHeader({
  avatarSource,
  childName,
  welcomeLabel = 'WELCOME BACK!',
  greetingText,
  style,
  children,
}: ChildSpaceHeaderProps) {
  const { requestParentAccess } = useChildSpaceBoundary();

  const iconScale = useSharedValue(1);

  const displayGreeting = greetingText || `Good morning, ${childName}! ☀️`;

  const handleControlsPress = useCallback(() => {
    iconScale.value = withSpring(0.85, { damping: 12, stiffness: 400 }, () => {
      iconScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

    // SECURITY: Parent access is delegated to the child-tabs layout so the PIN gate is centralized.
    requestParentAccess();
  }, [iconScale, requestParentAccess]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Image source={avatarSource} style={styles.avatar} />

        <View style={styles.textContainer}>
          <Text style={styles.welcomeLabel}>{welcomeLabel}</Text>
          <Text style={styles.greetingText} numberOfLines={1}>
            {displayGreeting}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Parent access - requires PIN"
          accessibilityRole="button"
          onPress={handleControlsPress}
          style={({ pressed }) => [
            styles.controlsButton,
            pressed && styles.controlsButtonPressed,
          ]}
        >
          <Animated.View style={animatedIconStyle}>
            <MaterialCommunityIcons
              color={Colors.primary}
              name="shield-account-outline"
              size={22}
            />
          </Animated.View>
        </Pressable>
      </View>

      {children}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  welcomeLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  greetingText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: Colors.text,
    lineHeight: 24,
    flexShrink: 1,
  },
  controlsButton: {
    width: Sizing.minTapTarget,
    height: Sizing.minTapTarget,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  controlsButtonPressed: {
    backgroundColor: Colors.surfaceContainerLow,
    transform: [{ scale: 0.95 }],
  },
});

export default ChildSpaceHeader;
