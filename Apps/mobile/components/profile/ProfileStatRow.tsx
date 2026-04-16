// Apps/mobile/components/profile/ProfileStatRow.tsx
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export interface ProfileStatItem {
  id: string;
  label: string;
  value: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface ProfileStatRowProps {
  items: ProfileStatItem[];
}

function ProfileStatRowComponent({ items }: ProfileStatRowProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.id} style={styles.statCard}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name={item.iconName} size={18} color={Colors.primary} />
          </View>
          <Text numberOfLines={1} style={styles.valueText}>
            {item.value}
          </Text>
          <Text numberOfLines={1} style={styles.labelText}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const ProfileStatRow = memo(ProfileStatRowComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  labelText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
