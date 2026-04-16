// Apps/mobile/components/chat/SafetyFlagBanner.tsx
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

interface SafetyFlagBannerProps {
  flags: string[];
}

export function SafetyFlagBanner({ flags }: SafetyFlagBannerProps) {
  const hasFlags = flags.length > 0;

  if (!hasFlags) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <MaterialCommunityIcons name="information-outline" size={18} color={Colors.secondary} />
      <Text style={styles.text}>I can only help with learning topics. Try asking about school subjects.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.secondaryContainer,
  },
  text: {
    ...Typography.captionMedium,
    color: Colors.text,
    flex: 1,
  },
});
