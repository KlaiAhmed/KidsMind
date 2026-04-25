/**
 * ChildSpaceHeader Component
 *
 * Wrapper for child space screens that adds:
 * - Controls/settings icon for parent access (top-right)
 * - Parent PIN gate modal
 * - Navigation lock integration
 *
 * Security: This component enforces that children cannot access
 * parent space without entering the correct parent PIN.
 *
 * Usage: Wrap every child space screen with this component.
 */

import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

import { Colors, Radii, Sizing, Spacing, Typography } from '@/constants/theme';
import { ParentPINGate } from '@/src/components/spaceSwitch/ParentPINGate';
import { useChildNavigationLock } from '@/src/hooks/useChildNavigationLock';
import { verifyParentPin } from '@/services/parentAccessService';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/services/toastClient';

interface ChildSpaceHeaderProps {
  /** Child's avatar image source */
  avatarSource: ImageSourcePropType;
  /** Child's display name */
  childName: string;
  /** Optional welcome label override */
  welcomeLabel?: string;
  /** Optional greeting text override */
  greetingText?: string;
  /** Additional container styles */
  style?: ViewStyle;
  /** Optional children to render below header */
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
  const router = useRouter();
  const { user } = useAuth();
  const [isPinGateOpen, setIsPinGateOpen] = useState(false);

  // Icon animation value
  const iconScale = useSharedValue(1);

  // Navigation lock - intercept back button
  useChildNavigationLock({
    isLocked: !isPinGateOpen,
    onBackAttempt: () => {
      // Back button pressed in child space - show PIN gate
      handleOpenPinGate();
    },
  });

  // Generate greeting if not provided
  const displayGreeting = greetingText || `Good morning, ${childName}! ☀️`;

  // Handle controls icon press with spring animation
  const handleControlsPress = useCallback(() => {
    'worklet';
    iconScale.value = withSpring(0.85, { damping: 12, stiffness: 400 }, () => {
      iconScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

    handleOpenPinGate();
  }, [iconScale]);

  // Open PIN gate
  const handleOpenPinGate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    // Check if PIN is configured
    if (!user?.pinConfigured) {
      showToast({
        type: 'error',
        text1: 'PIN not set',
        text2: 'Please set up your parent PIN first.',
        visibilityTime: 3000,
      });
      return;
    }

    setIsPinGateOpen(true);
  }, [user?.pinConfigured]);

  // Handle successful PIN verification
  const handlePinSuccess = useCallback(() => {
    setIsPinGateOpen(false);

    // Navigate to parent space
    // Use replace to clear child navigation history
    router.replace('/(tabs)' as never);
  }, [router]);

  // Handle PIN gate cancel
  const handlePinCancel = useCallback(() => {
    setIsPinGateOpen(false);
  }, []);

  // Verify PIN function for the gate
  const handleVerifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      return await verifyParentPin(pin);
    } catch (error) {
      // API errors are handled by the gate component
      return false;
    }
  }, []);

  // Animated icon style
  const animatedIconStyle = {
    transform: [{ scale: iconScale }],
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        {/* Avatar */}
        <Image source={avatarSource} style={styles.avatar} />

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeLabel}>{welcomeLabel}</Text>
          <Text style={styles.greetingText} numberOfLines={1}>
            {displayGreeting}
          </Text>
        </View>

        {/* Controls Icon - Parent Access */}
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

      {/* Children content */}
      {children}

      {/* PIN Gate Modal */}
      <ParentPINGate
        onCancel={handlePinCancel}
        onSuccess={handlePinSuccess}
        subtitle="Enter your PIN to access parent controls"
        title="Parent Access"
        verifyPin={handleVerifyPin}
        visible={isPinGateOpen}
      />
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
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
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
