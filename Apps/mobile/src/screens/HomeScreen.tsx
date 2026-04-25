import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useChildProfile } from '@/hooks/useChildProfile';
import { BadgeNotification } from '@/src/components/BadgeNotification';
import { FeaturedLesson } from '@/src/components/FeaturedLesson';
import { HomeHeader } from '@/src/components/HomeHeader';
import { ProgressCard } from '@/src/components/ProgressCard';
import { StreakCard } from '@/src/components/StreakCard';
import { SubjectGrid } from '@/src/components/SubjectGrid';
import { getChildTabSceneBottomPadding } from '@/components/navigation/bottomNavTokens';
import { buildSubjectGridItems } from '@/src/utils/profilePresentation';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, getAvatarById } = useChildProfile();
  const [showBadgeBanner, setShowBadgeBanner] = useState(true);

  const childTabSceneBottomPadding = getChildTabSceneBottomPadding(insets.bottom);

  const childName = profile?.nickname?.trim() || profile?.name?.trim() || 'Little Explorer';
  const avatarSource = getAvatarById(profile?.avatarId).asset;
  const currentXP = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const maxXP = profile?.xpToNextLevel ?? 100;
  const streakDays = profile?.streakDays ?? 0;

  const subjects = buildSubjectGridItems(profile?.subjectIds ?? []);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingBottom: childTabSceneBottomPadding }]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <HomeHeader avatarSource={avatarSource} childName={childName} />

        {showBadgeBanner ? <BadgeNotification onDismiss={() => setShowBadgeBanner(false)} /> : null}

        <ProgressCard currentXP={currentXP} level={level} maxXP={maxXP} />

        <StreakCard days={streakDays} />

        <FeaturedLesson
          category="SCIENCE • SPACE"
          description="You're halfway through! Discover why Saturn has those beautiful rings today."
          onTalkToKidsMind={() => router.push('/(tabs)/chat' as never)}
          title="Solar Systems"
        />

        <SubjectGrid subjects={subjects} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEEEF6',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#EEEEF6',
  },
  contentContainer: {
    flexGrow: 1,
  },
});
