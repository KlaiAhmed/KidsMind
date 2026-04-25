/**
 * ChildSwitchModal Component
 *
 * A confirmation modal for the Parent -> Child space switching flow.
 * Shows child's avatar, name, and requires explicit confirmation.
 *
 * Features spring-based scale animation on trigger, blur background,
 * and smooth fade + slide transition to child space.
 *
 * Location: Only triggered from Parent Dashboard Overview via rocket icon.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Gradients, Radii, Shadows, Sizing, Spacing, Typography } from '@/constants/theme';

interface ChildSwitchModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Child's display name */
  childName: string;
  /** Child's avatar image source */
  childAvatar?: ImageSourcePropType;
  /** Called when parent confirms switch to child space */
  onConfirm: () => void;
  /** Called when parent dismisses/cancels the switch */
  onDismiss: () => void;
  /** Loading state while transitioning */
  isTransitioning?: boolean;
}

export function ChildSwitchModal({
  visible,
  childName,
  childAvatar,
  onConfirm,
  onDismiss,
  isTransitioning = false,
}: ChildSwitchModalProps) {
  const insets = useSafeAreaInsets();
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Animation values
  const modalScale = useSharedValue(0.95);
  const modalOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // Reset and animate when visibility changes
  useEffect(() => {
    if (visible) {
      setIsConfirmed(false);

      // Modal open animation - scale + fade in
      modalScale.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      modalOpacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      contentTranslateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      // Reset values when closed
      modalScale.value = 0.95;
      modalOpacity.value = 0;
      contentTranslateY.value = 20;
    }
  }, [visible, modalScale, modalOpacity, contentTranslateY]);

  // Handle confirm with transition animation
  const handleConfirm = useCallback(() => {
    if (isTransitioning || isConfirmed) return;

    setIsConfirmed(true);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    // Start transition animation - fade out modal content
    modalOpacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.cubic),
    });

    // Small delay before calling onConfirm to allow animation
    setTimeout(() => {
      onConfirm();
    }, 250);
  }, [isTransitioning, isConfirmed, modalOpacity, onConfirm]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    // Animate out
    modalScale.value = withTiming(0.95, {
      duration: 150,
      easing: Easing.in(Easing.cubic),
    });
    modalOpacity.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.cubic),
    });

    setTimeout(() => {
      onDismiss();
    }, 150);
  }, [modalScale, modalOpacity, onDismiss]);

  // Animated styles
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }, { translateY: contentTranslateY.value }],
    opacity: modalOpacity.value,
  }));

  const renderAvatar = () => {
    if (childAvatar) {
      return (
        <Image
          resizeMode="cover"
          source={childAvatar}
          style={styles.avatarImage}
        />
      );
    }

    // Fallback avatar with initials
    const initials = childName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <LinearGradient
        colors={[...Gradients.indigoDepth.colors]}
        end={Gradients.indigoDepth.end}
        start={Gradients.indigoDepth.start}
        style={styles.avatarGradient}
      >
        <Text style={styles.avatarInitials}>{initials}</Text>
      </LinearGradient>
    );
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <StatusBar barStyle="light-content" translucent />

      {/* Blurred background */}
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />

      {/* Semi-transparent overlay */}
      <Pressable onPress={handleDismiss} style={styles.overlay} />

      {/* Modal container */}
      <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
          {/* Close button (top right) */}
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={handleDismiss}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <MaterialCommunityIcons color={Colors.textSecondary} name="close" size={24} />
          </Pressable>

          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>{renderAvatar()}</View>

            {/* Decorative ring around avatar */}
            <View style={styles.avatarRing} />
          </View>

          {/* Text content */}
          <View style={styles.textSection}>
            <Text style={styles.confirmationText}>Switch to</Text>
            <Text style={styles.childNameText} numberOfLines={1}>
              {childName}'s space?
            </Text>
            <Text style={styles.subtitleText}>
              You'll enter the child learning environment with full access to lessons and activities.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonSection}>
            {/* Primary CTA - Let's Go */}
            <Pressable
              accessibilityLabel={`Enter ${childName}'s space`}
              accessibilityRole="button"
              disabled={isTransitioning || isConfirmed}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && !isTransitioning && styles.confirmButtonPressed,
                (isTransitioning || isConfirmed) && styles.confirmButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={[...Gradients.indigoDepth.colors]}
                end={Gradients.indigoDepth.end}
                start={Gradients.indigoDepth.start}
                style={styles.confirmButtonGradient}
              >
                {isTransitioning || isConfirmed ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      color={Colors.white}
                      name="rocket-launch"
                      size={20}
                    />
                    <Text style={styles.confirmButtonText}>Let's go!</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Secondary dismiss */}
            <Pressable
              accessibilityLabel="Stay in parent space"
              accessibilityRole="button"
              disabled={isTransitioning}
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.dismissButtonPressed,
                isTransitioning && styles.dismissButtonDisabled,
              ]}
            >
              <Text style={styles.dismissButtonText}>Stay here</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.3)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: Sizing.minTapTarget,
    height: Sizing.minTapTarget,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    zIndex: 1,
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...Typography.display,
    fontSize: 36,
    color: Colors.white,
  },
  avatarRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: Colors.primaryFixed,
    opacity: 0.5,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  confirmationText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  childNameText: {
    ...Typography.headline,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitleText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
  buttonSection: {
    width: '100%',
    gap: Spacing.md,
  },
  confirmButton: {
    width: '100%',
    borderRadius: Radii.full,
    overflow: 'hidden',
    ...Shadows.button,
  },
  confirmButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonGradient: {
    height: Sizing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  confirmButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  dismissButton: {
    width: '100%',
    height: Sizing.buttonHeight,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  dismissButtonPressed: {
    backgroundColor: Colors.surfaceContainer,
    transform: [{ scale: 0.98 }],
  },
  dismissButtonDisabled: {
    opacity: 0.5,
  },
  dismissButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
});
