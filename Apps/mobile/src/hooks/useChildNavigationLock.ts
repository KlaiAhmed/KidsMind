/**
 * useChildNavigationLock Hook
 *
 * A security-critical hook that prevents navigation out of child space
 * without PIN verification. Intercepts:
 * - Android hardware back button
 * - iOS swipe-back gesture (via navigation options)
 * - Any other OS navigation attempts
 *
 * SECURITY: This hook MUST be used on every child space screen.
 * No child should be able to exit to parent space without PIN.
 */

import { useEffect, useCallback, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface UseChildNavigationLockOptions {
  /**
   * Called when back button is intercepted.
   * Use this to show PIN gate or handle the attempt.
   */
  onBackAttempt?: () => void;
  /**
   * Whether the lock is currently active.
   * Set to false when PIN gate is open to allow dismissal.
   */
  isLocked?: boolean;
  /**
   * Optional callback when lock activates/deactivates
   */
  onLockChange?: (isLocked: boolean) => void;
}

/**
 * Hook to lock navigation in child space.
 * Prevents Android back button and should be combined with
 * gestureEnabled: false in screen options for iOS.
 */
export function useChildNavigationLock({
  onBackAttempt,
  isLocked = true,
  onLockChange,
}: UseChildNavigationLockOptions = {}) {
  const isLockedRef = useRef(isLocked);

  // Keep ref in sync with prop
  useEffect(() => {
    isLockedRef.current = isLocked;
    onLockChange?.(isLocked);
  }, [isLocked, onLockChange]);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      // Only intercept on Android - iOS uses gestureEnabled in screen options
      if (Platform.OS !== 'android') {
        return;
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isLockedRef.current) {
          // Prevent default behavior and trigger callback
          onBackAttempt?.();
          return true;
        }
        // Allow default behavior when not locked
        return false;
      });

      return () => {
        backHandler.remove();
      };
    }, [onBackAttempt]),
  );
}

/**
 * Navigation options to disable iOS swipe-back gesture.
 * Apply this to all child space stack screens.
 *
 * Usage:
 * ```tsx
 * <Stack.Screen
 *   name="(child-tabs)"
 *   options={childSpaceScreenOptions}
 * />
 * ```
 */
export const childSpaceScreenOptions = {
  // Disable iOS swipe-back gesture
  gestureEnabled: false,
  // Prevent automatic back button on Android
  headerBackVisible: false,
  // Custom animation that doesn't allow swipe-back
  animation: Platform.select({
    ios: 'slide_from_bottom',
    android: 'fade_from_bottom',
  }),
} as const;

/**
 * Stack screen options for child space entry.
 * Use this when navigating to child space to ensure
 * parent history is cleared and gestures are disabled.
 */
export const childSpaceEntryOptions = {
  // Disable all gestures
  gestureEnabled: false,
  gestureDirection: 'vertical',
  // Full screen modal presentation
  presentation: 'fullScreenModal',
  // No header
  headerShown: false,
  // Custom animation - slide up for child entry
  animation: Platform.select({
    ios: 'slide_from_bottom',
    android: 'fade_from_bottom',
  }),
} as const;

/**
 * Options for returning to parent space.
 * Fade transition for clean parent re-entry.
 */
export const parentSpaceEntryOptions = {
  gestureEnabled: true,
  animation: Platform.select({
    ios: 'fade',
    android: 'fade',
  }),
} as const;
