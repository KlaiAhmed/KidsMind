import { type StyleProp, type ViewStyle, ActivityIndicator, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { Colors, Gradients, Radii, Sizing, Typography } from '@/constants/theme';

export interface PrimaryButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  style,
  ...rest
}: PrimaryButtonProps) {
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      accessibilityLabel={label}
      style={[{ opacity: isInactive ? 0.5 : 1 }, style]}
      {...rest}
    >
      <LinearGradient
        colors={[...Gradients.indigoDepth.colors]}
        start={Gradients.indigoDepth.start}
        end={Gradients.indigoDepth.end}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = {
  gradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%' as const,
  },
  label: {
    ...Typography.bodySemiBold,
    color: Colors.white,
    textAlign: 'center' as const,
  },
};
