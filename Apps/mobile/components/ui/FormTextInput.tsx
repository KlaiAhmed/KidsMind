import { type TextInputProps, View, Text, StyleSheet } from 'react-native';
import { TextInput as RNTextInput } from 'react-native';
import { useRef } from 'react';
import { Colors, Radii, Typography, Spacing } from '@/constants/theme';

export interface FormTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAccessory?: React.ReactNode;
}

export function FormTextInput({
  label,
  error,
  leftIcon,
  rightAccessory,
  style,
  ...rest
}: FormTextInputProps) {
  const inputRef = useRef<RNTextInput>(null);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, !!error && styles.inputRowError]}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <RNTextInput
          ref={inputRef}
          style={[styles.input, leftIcon ? styles.inputWithIcon : undefined]}
          placeholderTextColor={Colors.placeholder}
          selectionColor={Colors.primary}
          {...rest}
        />
        {rightAccessory && (
          <View style={styles.iconRight}>{rightAccessory}</View>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.captionMedium,
    color: Colors.inputLabel,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  iconLeft: {
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    marginLeft: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
    height: 52,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  errorText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.errorText,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
