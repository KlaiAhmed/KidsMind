import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Gradients, Sizing, Spacing, Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding' as never);
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Gradients.indigoDepth.colors]}
        start={Gradients.indigoDepth.start}
        end={Gradients.indigoDepth.end}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View
        entering={FadeIn.duration(800)}
        exiting={FadeOut.duration(400)}
        style={styles.content}
      >
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons
            name="brain"
            size={Sizing.iconBadge}
            color={Colors.white}
          />
        </View>
        <Text style={styles.brandName}>KidsMind</Text>
        <Text style={styles.tagline}>Growing curious minds, together</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoBadge: {
    width: Sizing.iconBadge * 2,
    height: Sizing.iconBadge * 2,
    borderRadius: Sizing.iconBadge,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  brandName: {
    ...Typography.display,
    fontSize: 40,
    color: Colors.white,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  tagline: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
  },
});
