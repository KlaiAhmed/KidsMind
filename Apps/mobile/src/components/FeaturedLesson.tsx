import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '@/constants/theme';

interface FeaturedLessonProps {
  category: string;
  description: string;
  onResume?: () => void;
  onTalkToKidsMind?: () => void;
  title: string;
}

export function FeaturedLesson({
  category,
  description,
  onResume,
  onTalkToKidsMind,
  title,
}: FeaturedLessonProps) {
  const normalizedCategory = category.replace(/\s*\+\s*/g, ' • ');

  return (
    <View style={styles.featuredCard}>
      <View pointerEvents="none" style={styles.planetArt}>
        <View style={styles.planetGlow} />
        <View style={styles.planetBody} />
        <View style={styles.planetRing} />
        <View style={styles.planetMoon} />
        <View style={styles.planetSpark} />
      </View>

      <View style={styles.categoryPill}>
        <Text style={styles.categoryText}>{normalizedCategory}</Text>
      </View>

      <Text style={styles.featuredTitle}>{title}</Text>

      <Text style={styles.featuredDesc}>{description}</Text>

      <View style={styles.featuredBottomRow}>
        <Pressable onPress={onResume} style={styles.resumeButton}>
          <Text style={styles.resumeText}>Resume ▶</Text>
        </Pressable>

        <Pressable onPress={onTalkToKidsMind} style={styles.talkButton}>
          <MaterialCommunityIcons color="#FFFFFF" name="chat-processing-outline" size={16} />
          <Text style={styles.talkText}>Talk to KidsMind</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    paddingBottom: 16,
    overflow: 'hidden',
    minHeight: 200,
    position: 'relative',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
    zIndex: 1,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  planetArt: {
    position: 'absolute',
    right: -10,
    top: '10%',
    width: 130,
    height: 130,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetGlow: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  planetBody: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FBBF24',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  planetRing: {
    position: 'absolute',
    width: 112,
    height: 28,
    borderRadius: 20,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-14deg' }],
  },
  planetMoon: {
    position: 'absolute',
    top: 18,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FDE68A',
  },
  planetSpark: {
    position: 'absolute',
    top: 10,
    left: 18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.80)',
  },
  featuredTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 10,
    zIndex: 1,
  },
  featuredDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: '65%',
    zIndex: 1,
  },
  featuredBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    zIndex: 1,
  },
  resumeButton: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resumeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Colors.text,
  },
  talkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    ...Shadows.button,
  },
  talkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Colors.white,
  },
});
