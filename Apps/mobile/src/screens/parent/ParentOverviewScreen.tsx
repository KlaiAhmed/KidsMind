import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ActivityFlaggedBanner } from '@/src/components/parent/ActivityFlaggedBanner';
import { ChildAvatarChip } from '@/src/components/parent/ChildAvatarChip';
import { StatTile } from '@/src/components/parent/StatTile';
import { SubjectProgressBar } from '@/src/components/parent/SubjectProgressBar';
import { Colors, Gradients, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import type { ChildProfile } from '@/types/child';

type OverviewScreenState = 'loading' | 'ready' | 'error' | 'empty';

interface SubjectActivityItem {
  id: string;
  label: string;
  valueLabel: string;
  progress: number;
  fillColor: string;
}

interface OverviewFlag {
  flagged: boolean;
  timestampLabel: string;
}

interface OverviewChild {
  id: string;
  name: string;
  gradeLabel: string;
  avatarSource: ImageSourcePropType;
  screenTimeLabel: string;
  screenTimeProgress: number;
  screenGoalLabel: string;
  exercisesLabel: string;
  exercisesDeltaLabel: string;
  averageScoreLabel: string;
  averageScoreBars: number[];
  streakLabel: string;
  streakSubtitle: string;
  isPersonalRecord: boolean;
  flaggedActivity: OverviewFlag;
  subjectActivity: SubjectActivityItem[];
}

interface ParentOverviewData {
  parentName: string;
  dateLabel: string;
  parentAvatarSource: ImageSourcePropType;
  activeChildId: string;
  children: OverviewChild[];
}

export interface ParentOverviewScreenProps {
  initialState?: OverviewScreenState;
  initialData?: ParentOverviewData;
  errorMessage?: string;
}

const ADDITIONAL_CHILDREN = [
  {
    id: 'child-maya',
    name: 'Maya',
    gradeLabel: '5th Grade',
    avatarId: 'avatar-2',
    screenTimeLabel: '58m',
    screenTimeProgress: 0.48,
    screenGoalLabel: 'Goal: 2h',
    exercisesLabel: '8',
    exercisesDeltaLabel: '+3 from yesterday',
    averageScoreLabel: '91%',
    averageScoreBars: [18, 22, 30, 36],
    streakLabel: '11 days',
    streakSubtitle: 'Momentum is strong',
    isPersonalRecord: false,
    flaggedActivity: {
      flagged: false,
      timestampLabel: '5:42 PM',
    },
    subjectActivity: [
      {
        id: 'math',
        label: 'Mathematics',
        valueLabel: '3h 20m',
        progress: 0.8,
        fillColor: Colors.primaryDark,
      },
      {
        id: 'science',
        label: 'Science & Tech',
        valueLabel: '2h 35m',
        progress: 0.64,
        fillColor: Colors.secondary,
      },
      {
        id: 'creative',
        label: 'Creative Arts',
        valueLabel: '1h 10m',
        progress: 0.3,
        fillColor: Colors.tertiaryContainer,
      },
    ],
  },
  {
    id: 'child-sarah',
    name: 'Sarah',
    gradeLabel: '2nd Grade',
    avatarId: 'avatar-4',
    screenTimeLabel: '42m',
    screenTimeProgress: 0.7,
    screenGoalLabel: 'Goal: 1h',
    exercisesLabel: '5',
    exercisesDeltaLabel: '+1 from yesterday',
    averageScoreLabel: '84%',
    averageScoreBars: [14, 18, 24, 28],
    streakLabel: '6 days',
    streakSubtitle: 'On track for a new streak',
    isPersonalRecord: false,
    flaggedActivity: {
      flagged: false,
      timestampLabel: '1:18 PM',
    },
    subjectActivity: [
      {
        id: 'math',
        label: 'Mathematics',
        valueLabel: '1h 40m',
        progress: 0.58,
        fillColor: Colors.primaryDark,
      },
      {
        id: 'science',
        label: 'Science & Tech',
        valueLabel: '55m',
        progress: 0.28,
        fillColor: Colors.secondary,
      },
      {
        id: 'creative',
        label: 'Creative Arts',
        valueLabel: '1h 25m',
        progress: 0.68,
        fillColor: Colors.tertiaryContainer,
      },
    ],
  },
] as const;

function SkeletonBlock({ height, width }: { height: number; width: number | `${number}%` }) {
  const shimmer = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.55,
          duration: 700,
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
          height,
          width,
          opacity: shimmer,
        },
      ]}
    />
  );
}

function OverviewSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.skeletonContent} showsVerticalScrollIndicator={false}>
      <SkeletonBlock height={82} width={'100%'} />
      <SkeletonBlock height={96} width={'100%'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.skeletonRow}>
          <SkeletonBlock height={152} width={176} />
          <SkeletonBlock height={152} width={176} />
          <SkeletonBlock height={152} width={176} />
          <SkeletonBlock height={152} width={176} />
        </View>
      </ScrollView>
      <SkeletonBlock height={96} width={'100%'} />
      <SkeletonBlock height={220} width={'100%'} />
      <SkeletonBlock height={176} width={'100%'} />
    </ScrollView>
  );
}

function getFirstName(fullName?: string | null): string {
  if (!fullName) {
    return 'Parent';
  }

  return fullName.trim().split(/\s+/)[0] ?? 'Parent';
}

function buildOverviewData(params: {
  childProfile: ChildProfile | null;
  parentName?: string | null;
  getAvatarSource: (avatarId: string) => ImageSourcePropType;
  initialData?: ParentOverviewData;
}): ParentOverviewData {
  if (params.initialData) {
    return params.initialData;
  }

  const activeChildId = params.childProfile?.id ?? 'child-leo';
  const activeChildName = params.childProfile?.nickname ?? params.childProfile?.name ?? 'Leo';
  const activeGrade = params.childProfile?.gradeLevel ?? '3rd Grade';
  const activeAvatarId = params.childProfile?.avatarId ?? 'avatar-1';
  const activeDailyLimitMinutes = params.childProfile?.rules?.dailyLimitMinutes ?? 120;
  const activeCompletedMinutes = params.childProfile?.dailyCompletedMinutes ?? 80;
  const activeProgress = activeDailyLimitMinutes > 0 ? activeCompletedMinutes / activeDailyLimitMinutes : 0;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const activeChild: OverviewChild = {
    id: activeChildId,
    name: activeChildName,
    gradeLabel: activeGrade,
    avatarSource: params.getAvatarSource(activeAvatarId),
    screenTimeLabel: '1h 20m',
    screenTimeProgress: activeProgress,
    screenGoalLabel: 'Goal: 2h',
    exercisesLabel: `${Math.max(params.childProfile?.totalExercisesCompleted ?? 12, 12)}`,
    exercisesDeltaLabel: '+4 from yesterday',
    averageScoreLabel: '88%',
    averageScoreBars: [16, 24, 29, 33],
    streakLabel: `${Math.max(params.childProfile?.streakDays ?? 9, 9)} days`,
    streakSubtitle:
      (params.childProfile?.streakDays ?? 9) >= 9 ? 'Personal Record!!' : 'One day from a new high',
    isPersonalRecord: (params.childProfile?.streakDays ?? 9) >= 9,
    flaggedActivity: {
      flagged: true,
      timestampLabel: '6:20 PM',
    },
    subjectActivity: [
      {
        id: 'math',
        label: 'Mathematics',
        valueLabel: '4h 05m',
        progress: 0.82,
        fillColor: Colors.primaryDark,
      },
      {
        id: 'science',
        label: 'Science & Tech',
        valueLabel: '2h 15m',
        progress: 0.56,
        fillColor: Colors.secondary,
      },
      {
        id: 'creative',
        label: 'Creative Arts',
        valueLabel: '1h 05m',
        progress: 0.24,
        fillColor: Colors.tertiaryContainer,
      },
    ],
  };

  return {
    parentName: getFirstName(params.parentName),
    dateLabel,
    parentAvatarSource: params.getAvatarSource('avatar-6'),
    activeChildId,
    children: [
      activeChild,
      ...ADDITIONAL_CHILDREN.map((child) => ({
        ...child,
        avatarSource: params.getAvatarSource(child.avatarId),
      })),
    ],
  };
}

export default function ParentOverviewScreen({
  initialState,
  initialData,
  errorMessage = 'Something interrupted the dashboard refresh.',
}: ParentOverviewScreenProps) {
  const router = useRouter();
  const { childProfile, user } = useAuth();
  const { getAvatarById } = useChildProfile();

  const [viewState, setViewState] = useState<OverviewScreenState>(
    initialState ?? (childProfile ? 'ready' : 'empty')
  );
  const [selectedChildId, setSelectedChildId] = useState<string>(childProfile?.id ?? 'child-leo');
  const [rangeLabel, setRangeLabel] = useState<'This Week' | 'Last 30 Days'>('This Week');

  const overviewData = useMemo(
    () =>
      buildOverviewData({
        childProfile,
        parentName: user?.fullName,
        getAvatarSource: (avatarId) => getAvatarById(avatarId).asset,
        initialData,
      }),
    [childProfile, getAvatarById, initialData, user?.fullName]
  );

  useEffect(() => {
    setSelectedChildId(overviewData.activeChildId);
  }, [overviewData.activeChildId]);

  const activeChild =
    overviewData.children.find((child) => child.id === selectedChildId) ?? overviewData.children[0];

  function handleSettingsPress() {
    void router.push(`/(tabs)/profile?childId=${encodeURIComponent(activeChild.id)}` as never);
  }

  function handleChildPress(childId: string) {
    setSelectedChildId(childId);
    void router.push(`/(tabs)/explore?childId=${encodeURIComponent(childId)}` as never);
  }

  function handleAddChild() {
    void router.push('/(auth)/child-profile-wizard' as never);
  }

  function handleReviewFlag() {
    void router.push(
      `/(tabs)/chat?childId=${encodeURIComponent(activeChild.id)}&flaggedOnly=true` as never
    );
  }

  function handleManageRules() {
    void router.push(`/(tabs)/profile?childId=${encodeURIComponent(activeChild.id)}` as never);
  }

  function handleExportReport() {
    void router.push(`/(tabs)/explore?childId=${encodeURIComponent(activeChild.id)}` as never);
  }

  if (viewState === 'loading') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <OverviewSkeleton />
      </SafeAreaView>
    );
  }

  if (viewState === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackContainer}>
          <MaterialCommunityIcons
            accessibilityLabel="Overview unavailable"
            color={Colors.errorText}
            name="alert-circle-outline"
            size={32}
          />
          <Text style={styles.feedbackTitle}>Dashboard needs a refresh</Text>
          <Text style={styles.feedbackBody}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading parent overview"
            onPress={() => setViewState('ready')}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.outlinePressed : null]}
          >
            <Text style={styles.secondaryActionLabel}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (viewState === 'empty' || overviewData.children.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackContainer}>
          <MaterialCommunityIcons
            accessibilityLabel="No child profiles"
            color={Colors.primary}
            name="account-child-circle"
            size={40}
          />
          <Text style={styles.feedbackTitle}>Your parent dashboard is ready</Text>
          <Text style={styles.feedbackBody}>
            Add a child profile to unlock screen-time controls, progress reports, and safety alerts.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a new child"
            onPress={handleAddChild}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.outlinePressed : null]}
          >
            <Text style={styles.secondaryActionLabel}>Add New Child</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.parentIdentity}>
            <Image contentFit="cover" source={overviewData.parentAvatarSource} style={styles.parentAvatar} />
            <View style={styles.parentCopy}>
              <Text style={styles.greeting}>Hi {overviewData.parentName}!</Text>
              <Text style={styles.dateText}>{overviewData.dateLabel}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.headerIconShell}>
              <MaterialCommunityIcons accessibilityLabel="Protected parent mode" color={Colors.primary} name="lock-outline" size={20} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open parental controls"
              onPress={handleSettingsPress}
              style={({ pressed }) => [
                styles.headerIconShell,
                pressed ? styles.headerIconShellPressed : null,
              ]}
            >
              <MaterialCommunityIcons accessibilityLabel="Settings" color={Colors.text} name="cog-outline" size={20} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ScrollView
            horizontal
            contentContainerStyle={styles.childChipRow}
            showsHorizontalScrollIndicator={false}
          >
            {overviewData.children.map((child) => (
              <ChildAvatarChip
                key={child.id}
                avatarSource={child.avatarSource}
                isActive={child.id === activeChild.id}
                label={child.name}
                onPress={() => handleChildPress(child.id)}
              />
            ))}
            <ChildAvatarChip label="+ Add" onPress={handleAddChild} variant="add" />
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ScrollView
            horizontal
            contentContainerStyle={styles.statsRow}
            showsHorizontalScrollIndicator={false}
          >
            <StatTile
              accentColor={Colors.primary}
              progress={activeChild.screenTimeProgress}
              subtitle={activeChild.screenGoalLabel}
              title="Screen Time"
              value={activeChild.screenTimeLabel}
              variant="screenTime"
            />
            <StatTile
              subtitle={activeChild.exercisesDeltaLabel}
              title="Exercises"
              trendDirection="up"
              value={activeChild.exercisesLabel}
              variant="exercises"
            />
            <StatTile
              bars={activeChild.averageScoreBars}
              subtitle="Steady gains this week"
              title="Avg Score"
              value={activeChild.averageScoreLabel}
              variant="avgScore"
            />
            <StatTile
              isRecord={activeChild.isPersonalRecord}
              subtitle={activeChild.streakSubtitle}
              title="Daily Streak"
              value={activeChild.streakLabel}
              variant="streak"
            />
          </ScrollView>
        </View>

        <ActivityFlaggedBanner
          childName={activeChild.name}
          flagged={activeChild.flaggedActivity.flagged}
          onReview={handleReviewFlag}
          timestampLabel={activeChild.flaggedActivity.timestampLabel}
        />

        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subject Activity</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change subject activity range"
              onPress={() =>
                setRangeLabel((current) => (current === 'This Week' ? 'Last 30 Days' : 'This Week'))
              }
              style={({ pressed }) => [styles.rangeChip, pressed ? styles.rangeChipPressed : null]}
            >
              <Text style={styles.rangeChipLabel}>{rangeLabel}</Text>
              <MaterialCommunityIcons accessibilityLabel="Change range" color={Colors.primary} name="chevron-down" size={18} />
            </Pressable>
          </View>

          <View style={styles.sectionBody}>
            {activeChild.subjectActivity.map((subject) => (
              <SubjectProgressBar
                key={subject.id}
                fillColor={subject.fillColor}
                label={subject.label}
                progress={subject.progress}
                valueLabel={subject.valueLabel}
              />
            ))}
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export PDF report"
            onPress={handleExportReport}
            style={({ pressed }) => [styles.primaryActionWrapper, pressed ? styles.primaryActionPressed : null]}
          >
            <LinearGradient
              colors={[...Gradients.indigoDepth.colors]}
              end={Gradients.indigoDepth.end}
              start={Gradients.indigoDepth.start}
              style={styles.primaryActionGradient}
            >
              <MaterialCommunityIcons accessibilityLabel="Export report" color={Colors.white} name="file-pdf-box" size={20} />
              <Text style={styles.primaryActionLabel}>Export PDF Report</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a new child"
            onPress={handleAddChild}
            style={({ pressed }) => [styles.outlineAction, pressed ? styles.outlinePressed : null]}
          >
            <MaterialCommunityIcons accessibilityLabel="Add child" color={Colors.primary} name="account-plus-outline" size={20} />
            <Text style={styles.outlineActionLabel}>Add New Child</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Manage rules for ${activeChild.name}`}
            onPress={handleManageRules}
            style={({ pressed }) => [styles.outlineAction, pressed ? styles.outlinePressed : null]}
          >
            <MaterialCommunityIcons accessibilityLabel="Manage rules" color={Colors.primary} name="shield-crown-outline" size={20} />
            <Text style={styles.outlineActionLabel}>Manage Rules</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl + Spacing.xxl,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  parentIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  parentAvatar: {
    width: 54,
    height: 54,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  parentCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    ...Typography.title,
    color: Colors.text,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconShell: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconShellPressed: {
    transform: [{ scale: 0.97 }],
  },
  section: {
    gap: Spacing.sm,
  },
  childChipRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  statsRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  cardSection: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
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
  rangeChip: {
    minHeight: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rangeChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  rangeChipLabel: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  sectionBody: {
    gap: Spacing.md,
  },
  primaryActionWrapper: {
    borderRadius: Radii.full,
    overflow: 'hidden',
    ...Shadows.button,
  },
  primaryActionPressed: {
    transform: [{ scale: 0.99 }],
  },
  primaryActionGradient: {
    minHeight: 56,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  primaryActionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  outlineAction: {
    minHeight: 56,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  outlinePressed: {
    transform: [{ scale: 0.99 }],
  },
  outlineActionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  feedbackTitle: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
  },
  feedbackBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  secondaryAction: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  secondaryActionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  skeletonContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl + Spacing.xxl,
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
});
