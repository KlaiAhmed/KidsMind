// Apps/mobile/screens/ChildProfileHub.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { ProfileHeroCard } from '@/components/profile/ProfileHeroCard';
import { ProfileStatRow, type ProfileStatItem } from '@/components/profile/ProfileStatRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useBadges } from '@/hooks/useBadges';
import { useChildProfile } from '@/hooks/useChildProfile';

const MIN_CHILD_TAP_TARGET = 56;

interface PlaceholderItem {
  id: string;
}

const PLACEHOLDER_DATA: PlaceholderItem[] = [];

function ProfileHubSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonBlock, { height: 220 }]} />
      <View style={[styles.skeletonBlock, { height: 170 }]} />
      <View style={[styles.skeletonBlock, { height: 138 }]} />
    </View>
  );
}

export default function ChildProfileHub() {
  const router = useRouter();
  const {
    profile,
    getAvatarById,
    isLoading: isProfileLoading,
    error: profileError,
    refreshProfileFromApi,
  } = useChildProfile();
  const {
    earnedBadges,
    isLoading: isBadgesLoading,
    error: badgeError,
    refresh: refreshBadges,
  } = useBadges();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showLevelUpOverlay, setShowLevelUpOverlay] = useState<boolean>(false);

  useEffect(() => {
    void refreshProfileFromApi();
  }, [refreshProfileFromApi]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (profile.xp >= profile.xpToNextLevel) {
      setShowLevelUpOverlay(true);
      const timer = setTimeout(() => {
        setShowLevelUpOverlay(false);
      }, 1200);

      return () => {
        clearTimeout(timer);
      };
    }

    setShowLevelUpOverlay(false);
    return undefined;
  }, [profile]);

  const stats = useMemo<ProfileStatItem[]>(() => {
    if (!profile) {
      return [];
    }

    return [
      {
        id: 'streak',
        label: 'Streak Days',
        value: `${profile.streakDays}`,
        iconName: 'fire',
      },
      {
        id: 'subjects',
        label: 'Subjects',
        value: `${profile.totalSubjectsExplored}`,
        iconName: 'book-open-variant',
      },
      {
        id: 'exercises',
        label: 'Exercises',
        value: `${profile.totalExercisesCompleted}`,
        iconName: 'pencil-box-multiple',
      },
      {
        id: 'badges',
        label: 'Badges',
        value: `${profile.totalBadgesEarned || earnedBadges.length}`,
        iconName: 'medal',
      },
    ];
  }, [earnedBadges.length, profile]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfileFromApi(), refreshBadges()]);
    } finally {
      setRefreshing(false);
    }
  }

  const renderPlaceholder: ListRenderItem<PlaceholderItem> = () => null;

  if (isProfileLoading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ProfileHubSkeleton />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-child-circle" size={48} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Set up a child profile to continue</Text>
          <Text style={styles.emptySubtitle}>Create your profile to unlock badges and AI chat.</Text>
          <PrimaryButton
            label="Open Profile Wizard"
            onPress={() => router.push('/(auth)/child-profile-wizard' as never)}
            style={styles.primaryAction}
          />
        </View>
      </SafeAreaView>
    );
  }

  const avatarSource = getAvatarById(profile.avatarId).asset;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <FlatList
        data={PLACEHOLDER_DATA}
        renderItem={renderPlaceholder}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <ProfileHeroCard
              avatarSource={avatarSource}
              nickname={profile.nickname ?? profile.name}
              level={profile.level}
              currentXP={profile.xp}
              xpToNextLevel={profile.xpToNextLevel}
              showLevelUpOverlay={showLevelUpOverlay}
              onEditProfile={() => router.push('/(auth)/child-profile-wizard?mode=edit' as never)}
            />

            <ProfileStatRow items={stats} />

            {profileError || badgeError ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.errorText} />
                <Text style={styles.errorText}>{profileError ?? badgeError}</Text>
              </View>
            ) : null}

            <View style={styles.quickActionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open badge gallery"
                onPress={() => router.push('/badges' as never)}
                style={({ pressed }) => [styles.quickActionCard, pressed ? styles.quickActionPressed : null]}
              >
                <MaterialCommunityIcons name="medal" size={24} color={Colors.primary} />
                <Text style={styles.quickActionTitle}>My Badges</Text>
                <Text style={styles.quickActionSubtitle}>
                  {isBadgesLoading ? 'Loading progress...' : `${earnedBadges.length} earned`}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open AI Chat"
                onPress={() => router.push('/(tabs)/chat' as never)}
                style={({ pressed }) => [styles.quickActionCard, pressed ? styles.quickActionPressed : null]}
              >
                <MaterialCommunityIcons name="robot-happy-outline" size={24} color={Colors.primary} />
                <Text style={styles.quickActionTitle}>Chat with AI</Text>
                <Text style={styles.quickActionSubtitle}>Start learning now</Text>
              </Pressable>
            </View>

            <PrimaryButton
              label="Edit Profile"
              onPress={() => router.push('/(auth)/child-profile-wizard?mode=edit' as never)}
              style={styles.primaryAction}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  headerContent: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    minHeight: MIN_CHILD_TAP_TARGET,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  quickActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  quickActionTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  quickActionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  primaryAction: {
    marginTop: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
    flex: 1,
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  skeletonBlock: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
