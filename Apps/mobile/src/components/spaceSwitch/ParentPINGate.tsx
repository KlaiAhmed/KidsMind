/**
 * ParentPINGate Component
 *
 * A reusable PIN verification modal for child → parent access control.
 * Features blur background, custom PIN pad with app design tokens,
 * shake animation on wrong PIN, and secure session management.
 *
 * Security-critical: This gate has NO backdrop dismiss and requires
 * explicit PIN entry or cancel action to exit.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radii, Sizing, Spacing, Typography } from '@/constants/theme';

const PIN_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'] as const;
type PinDigit = (typeof PIN_DIGITS)[number];

type PinGateState = 'idle' | 'entering' | 'submitting' | 'error' | 'success';

interface PinDotProps {
  index: number;
  isFilled: boolean;
  isError: boolean;
  isSuccess: boolean;
  dotOpacity: SharedValue<number>;
  successCheckmarkStyle: Animated.AnimateStyle<typeof Animated.View>;
}

function PinDot({ index, isFilled, isError, isSuccess, dotOpacity, successCheckmarkStyle }: PinDotProps) {
  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View
      key={index}
      style={[
        styles.pinDot,
        isFilled && styles.pinDotFilled,
        isError && styles.pinDotError,
        dotAnimatedStyle,
      ]}
    >
      {isFilled && !isSuccess && <View style={styles.pinDotInner} />}
      {isFilled && isSuccess && index === 3 && (
        <Animated.View style={[styles.successCheckmark, successCheckmarkStyle]}>
          <MaterialCommunityIcons
            color={Colors.success}
            name="check-bold"
            size={16}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

interface ParentPINGateProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
  onBiometricSuccess?: () => void;
}

export function ParentPINGate({
  visible,
  onSuccess,
  onCancel,
  verifyPin,
  title = 'Parent Access',
  subtitle,
  onBiometricSuccess,
}: ParentPINGateProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<string>('');
  const [gateState, setGateState] = useState<PinGateState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const modalTranslateY = useSharedValue(300);
  const modalOpacity = useSharedValue(0);
  const shakeTranslateX = useSharedValue(0);
  const dotOpacity0 = useSharedValue(1);
  const dotOpacity1 = useSharedValue(1);
  const dotOpacity2 = useSharedValue(1);
  const dotOpacity3 = useSharedValue(1);
  const dotOpacityValues = useMemo(() => [dotOpacity0, dotOpacity1, dotOpacity2, dotOpacity3], [dotOpacity0, dotOpacity1, dotOpacity2, dotOpacity3]);
  const successScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      modalTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
      modalOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      const timer = setTimeout(() => {}, 300);
      return () => clearTimeout(timer);
    } else {
      setPin('');
      setGateState('idle');
      setErrorMessage('');
      modalTranslateY.value = 300;
      modalOpacity.value = 0;
      shakeTranslateX.value = 0;
      dotOpacityValues.forEach((sv) => { sv.value = 1; });
      successScale.value = 0;
    }
  }, [visible, modalTranslateY, modalOpacity, shakeTranslateX, dotOpacityValues, successScale]);

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, [visible]);

  const triggerShake = useCallback(() => {
    'worklet';
    shakeTranslateX.value = withSequence(
      withTiming(-10, { duration: 50, easing: Easing.out(Easing.cubic) }),
      withTiming(10, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
      withTiming(-10, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
      withTiming(10, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
      withTiming(-10, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0, { duration: 50, easing: Easing.out(Easing.cubic) }),
    );
    runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Error);
  }, [shakeTranslateX]);

  const animateDotEntry = useCallback(
    (index: number) => {
      'worklet';
      dotOpacityValues[index].value = withTiming(0.5, { duration: 80 });
      dotOpacityValues[index].value = withTiming(1, { duration: 150 });
    },
    [dotOpacityValues],
  );

  const handleDigitPress = useCallback(
    async (digit: PinDigit) => {
      if (gateState === 'submitting' || gateState === 'success') return;

      if (digit === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
        setGateState('idle');
        setErrorMessage('');
        return;
      }

      if (digit === '') return;

      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        animateDotEntry(newPin.length - 1);

        if (newPin.length === 4) {
          setGateState('submitting');
          Keyboard.dismiss();

          try {
            const isValid = await verifyPin(newPin);

            if (isValid) {
              setGateState('success');
              successScale.value = withSequence(
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 150 }),
              );
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                () => undefined,
              );
              setTimeout(() => { onSuccess(); }, 400);
            } else {
              setGateState('error');
              setErrorMessage('Incorrect PIN. Please try again.');
              triggerShake();
              setPin('');
            }
          } catch {
            setGateState('error');
            setErrorMessage('Something went wrong. Please try again.');
            triggerShake();
            setPin('');
          }
        }
      }
    },
    [pin, gateState, verifyPin, onSuccess, triggerShake, animateDotEntry, successScale],
  );

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onCancel();
  }, [onCancel]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
    opacity: modalOpacity.value,
  }));

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const successCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  const renderKey = (digit: PinDigit, index: number) => {
    const isBackspace = digit === 'backspace';
    const isEmpty = digit === '';

    if (isEmpty) {
      return <View key={`empty-${index}`} style={styles.keyButton} />;
    }

    return (
      <Pressable
        key={isBackspace ? 'backspace' : digit}
        accessibilityLabel={isBackspace ? 'Backspace' : digit}
        accessibilityRole="button"
        disabled={gateState === 'submitting' || gateState === 'success'}
        onPress={() => handleDigitPress(digit)}
        style={({ pressed }) => [
          styles.keyButton,
          pressed && styles.keyButtonPressed,
          (gateState === 'submitting' || gateState === 'success') && styles.keyButtonDisabled,
        ]}
      >
        {isBackspace ? (
          <MaterialCommunityIcons
            color={gateState === 'submitting' ? Colors.textTertiary : Colors.text}
            name="backspace-outline"
            size={24}
          />
        ) : (
          <Text style={styles.keyText}>{digit}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={() => {}}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <StatusBar barStyle="light-content" translucent />

      <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.overlay} />

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons color={Colors.primary} name="shield-account" size={32} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : (
              <Text style={styles.subtitle}>Enter your PIN to access parent controls</Text>
            )}
          </View>

<Animated.View style={[styles.pinDisplay, shakeAnimatedStyle]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <PinDot
            key={index}
            index={index}
            isFilled={index < pin.length}
            isError={gateState === 'error' && pin.length === 0}
            isSuccess={gateState === 'success'}
            dotOpacity={dotOpacityValues[index]}
            successCheckmarkStyle={successCheckmarkStyle}
          />
        ))}
      </Animated.View>

          {errorMessage && gateState === 'error' && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons color={Colors.errorText} name="alert-circle" size={16} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {gateState === 'submitting' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}

          <View style={styles.keypadContainer}>
            <View style={styles.keypadGrid}>
              {PIN_DIGITS.map((digit, index) => renderKey(digit, index))}
            </View>
          </View>

          <Pressable
            accessibilityLabel="Cancel and return to child space"
            accessibilityRole="button"
            disabled={gateState === 'submitting'}
            onPress={handleCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.headline,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: Radii.full,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  pinDotError: {
    borderColor: Colors.error,
  },
  pinDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  successCheckmark: {
    position: 'absolute',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.captionMedium,
    color: Colors.errorText,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    height: 24,
  },
  loadingText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  keypadContainer: {
    marginBottom: Spacing.lg,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  keyButton: {
    width: Sizing.minTapTarget * 1.1,
    height: Sizing.minTapTarget * 1.1,
    minWidth: 72,
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginVertical: 4,
  },
  keyButtonPressed: {
    backgroundColor: Colors.surfaceContainerHigh,
    transform: [{ scale: 0.96 }],
  },
  keyButtonDisabled: {
    opacity: 0.5,
  },
  keyText: {
    ...Typography.title,
    color: Colors.text,
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    minHeight: Sizing.minTapTarget,
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
});
