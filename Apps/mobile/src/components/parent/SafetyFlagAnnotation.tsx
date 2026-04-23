import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export interface SafetyFlagAnnotationProps {
  description: string;
}

export function SafetyFlagAnnotation({ description }: SafetyFlagAnnotationProps) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          accessibilityLabel="Safety flag"
          color={Colors.errorText}
          name="alert"
          size={16}
        />
        <Text style={styles.kicker}>Safety Flag</Text>
      </View>

      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  kicker: {
    ...Typography.label,
    color: Colors.errorText,
  },
  description: {
    ...Typography.captionMedium,
    color: Colors.errorText,
  },
});
