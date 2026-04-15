import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useSubjects } from '@/hooks/useSubjects';
import { GreetingHero } from '@/components/dashboard/GreetingHero';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { RecentActivityRow } from '@/components/dashboard/RecentActivityRow';
import { StreakBadge } from '@/components/dashboard/StreakBadge';
import { SubjectProgressCard } from '@/components/dashboard/SubjectProgressCard';

const HEADER_SPACER = 12;

function SkeletonBlock({ height, width }: { height: number; width: number | `${number}%` }) {
  const shimmer = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.55,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        styles.skeletonBlock,
        {
          width,
          height,
          opacity: shimmer,
        },
      ]}
    />
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonBlock height={146} width={'100%'} />
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={178} width={178} />
        <View style={styles.skeletonColumn}>
          <SkeletonBlock height={84} width={'100%'} />
          <SkeletonBlock height={84} width={'100%'} />
        </View>
      </View>
      <SkeletonBlock height={180} width={'100%'} />
      <SkeletonBlock height={90} width={'100%'} />
      <SkeletonBlock height={90} width={'100%'} />
      <SkeletonBlock height={90} width={'100%'} />
    </View>
  );
}

export default function ChildHomeDashboard() {
  const router = useRouter();
  const { profile, getAvatarById } = useChildProfile();
  const {
    selectedSubjects,
    activity,
    childDataError,
    refreshChildData,
    markSubjectAccess,
  } = useSubjects();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsInitialLoading(true);

      try {
        await Promise.all([
          refreshChildData(),
          new Promise((resolve) => setTimeout(resolve, 450)),
        ]);
      } finally {
        if (active) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshChildData]);

  const avatarSource = useMemo(() => {
    const avatar = getAvatarById(profile?.avatarId ?? 'avatar-1');
    return avatar?.asset;
  }, [getAvatarById, profile?.avatarId]);

  const recentActivity = activity.slice(0, 3);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshChildData();
    } finally {
      setRefreshing(false);
    }
  }

  function goToWizardEditMode() {
    router.push('/(auth)/child-profile-wizard?mode=edit' as never);
  }

  function openSubject(subjectId: string) {
    markSubjectAccess(subjectId);
    router.push(`/(tabs)/explore?subjectId=${subjectId}` as never);
  }

  function openRecentActivity(subjectId: string, topicId: string) {
    markSubjectAccess(subjectId);
    router.push(`/(tabs)/explore?subjectId=${subjectId}&topicId=${topicId}` as never);
  }

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <FlatList
        data={recentActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <GreetingHero
              childName={profile?.name ?? 'Explorer'}
              avatarSource={avatarSource}
              onAvatarPress={goToWizardEditMode}
            />

            <View style={styles.metricsRow}>
              <ProgressRing
                completedMinutes={profile?.dailyCompletedMinutes ?? 0}
                goalMinutes={profile?.dailyGoalMinutes ?? 25}
                color={Colors.primary}
              />
              <View style={styles.streakColumn}>
                <StreakBadge
                  streakDays={profile?.streakDays ?? 0}
                  onPress={() => router.push('/(tabs)/explore?filter=inProgress' as never)}
                />
                <View style={styles.supportCard}>
                  <Text style={styles.supportTitle}>Daily Spark</Text>
                  <Text style={styles.supportBody}>
                    Keep your streak alive with one more mini-lesson.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subject Progress</Text>
            </View>

            {selectedSubjects.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pick your subjects"
                onPress={() => router.push('/(tabs)/explore' as never)}
                style={({ pressed }) => [
                  styles.emptyCard,
                  pressed ? styles.emptyCardPressed : null,
                ]}
              >
                <Text style={styles.emptyTitle}>You have not picked subjects yet</Text>
                <Text style={styles.emptyBody}>Tap to explore subjects and start learning.</Text>
              </Pressable>
            ) : (
              <FlatList
                horizontal
                data={selectedSubjects}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.subjectListContent}
                ItemSeparatorComponent={() => <View style={{ width: HEADER_SPACER }} />}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <SubjectProgressCard
                    subject={item}
                    onPressCard={() => openSubject(item.id)}
                    onPressContinue={() => openSubject(item.id)}
                  />
                )}
              />
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {childDataError ? <Text style={styles.errorText}>{childDataError}</Text> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.noActivityCard}>
            <Text style={styles.noActivityTitle}>No lessons completed yet</Text>
            <Text style={styles.noActivityBody}>
              Start a subject to see your learning wins here.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => {
          const subject = selectedSubjects.find((entry) => entry.id === item.subjectId);

          return (
            <RecentActivityRow
              activity={item}
              subjectTitle={subject?.title ?? 'Learning'}
              onPress={() => openRecentActivity(item.subjectId, item.topicId)}
            />
          );
        }}
        refreshControl={
          <RefreshControl
            tintColor={Colors.primary}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
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
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  headerWrap: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  streakColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  supportCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  supportTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  supportBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  subjectListContent: {
    paddingBottom: Spacing.xs,
  },
  emptyCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    minHeight: 124,
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  emptyCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  emptyTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  emptyBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
  noActivityCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  noActivityTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  noActivityBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  skeletonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skeletonColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
});
