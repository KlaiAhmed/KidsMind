import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

interface LabeledToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onValueChange: (nextValue: boolean) => void;
}

export function LabeledToggleRow({
  label,
  description,
  value,
  disabled = false,
  accessibilityLabel,
  onValueChange,
}: LabeledToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => {
        if (!disabled) {
          onValueChange(!value);
        }
      }}
      style={({ pressed }) => [
        styles.container,
        disabled ? styles.containerDisabled : null,
        pressed ? styles.containerPressed : null,
      ]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        thumbColor={Colors.white}
        trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
        onValueChange={onValueChange}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  containerPressed: {
    transform: [{ scale: 0.99 }],
  },
  textWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
