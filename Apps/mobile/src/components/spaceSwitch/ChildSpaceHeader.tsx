import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';

import { Radii, Spacing, Colors } from '@/constants/theme';

interface ChildSpaceHeaderProps {
  avatarSource: ImageSourcePropType;
  childName: string;
  welcomeLabel?: string;
  greetingText?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

// PIN gate shield icon removed — a global PINGateHeaderButton overlay in the
// child-tabs layout now provides the PIN-gate entry point on ALL four tabs,
// eliminating the duplicate that existed when only Home had the shield.

export function ChildSpaceHeader({
  avatarSource,
  childName,
  welcomeLabel = 'WELCOME BACK!',
  greetingText,
  style,
  children,
}: ChildSpaceHeaderProps) {
  const displayGreeting = greetingText || `Good morning, ${childName}! ☀️`;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Image source={avatarSource} style={styles.avatar} />

        <View style={styles.textContainer}>
          <Text style={styles.welcomeLabel}>{welcomeLabel}</Text>
          <Text style={styles.greetingText} numberOfLines={1}>
            {displayGreeting}
          </Text>
        </View>
      </View>

      {children}
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
});

export default ChildSpaceHeader;
