import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { SubjectProgressBar } from '@/src/components/parent/SubjectProgressBar';
import { Colors, Gradients, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import type { ChildProfile } from '@/types/child';

type ProgressScreenState = 'loading' | 'ready' | 'error' | 'empty';

interface MasteryItem {
  id: string;
  label: string;
  percent: number;
}

interface SessionItem {
  id: string;
  title: string;
  iconName: 'sigma' | 'alphabetical-variant' | 'earth';
  dateDurationLabel: string;
  scoreLabel: string;
  badgeLabel: 'EXCELLENT' | 'PASSING' | 'MASTERED';
}

interface ProgressChildData {
  id: string;
  name: string;
  gradeLabel: string;
  avatarSource: ImageSourcePropType;
  dailyMinutesUsed: number;
  dailyLimitMinutes: number;
  lastSevenDays: number[];
  weeklyInsightTopic: string;
  weeklyInsightBody: string;
  weeklyInsightRecommendation: string;
  subjectMastery: MasteryItem[];
  overallPercent: number;
  recentSessions: SessionItem[];
}

export interface ChildProgressScreenProps {
  initialState?: ProgressScreenState;
  errorMessage?: string;
}

const SECONDARY_CHILDREN = [
  {
    id: 'child-maya',
    name: 'Maya',
    gradeLabel: '5th Grade',
    avatarId: 'avatar-2',
    dailyMinutesUsed: 62,
    dailyLimitMinutes: 120,
    lastSevenDays: [42, 50, 61, 48, 72, 66, 62],
    weeklyInsightTopic: 'reading comprehension',
    weeklyInsightBody: 'Maya is making strong gains in reading comprehension and stays engaged longest when prompts include short reflection questions.',
    weeklyInsightRecommendation: 'Suggesting 15 minutes of focused English support before free exploration time.',
    subjectMastery: [
      { id: 'math', label: 'Mathematics', percent: 88 },
      { id: 'english', label: 'English Literacy', percent: 81 },
      { id: 'science', label: 'Natural Science', percent: 94 },
    ],
    overallPercent: 86,
    recentSessions: [
      {
        id: 'session-1',
        title: 'Fractions Challenge',
        iconName: 'sigma',
        dateDurationLabel: 'Today | 18 min',
        scoreLabel: '16/18',
        badgeLabel: 'EXCELLENT',
      },
      {
        id: 'session-2',
        title: 'Paragraph Builder',
        iconName: 'alphabetical-variant',
        dateDurationLabel: 'Yesterday | 14 min',
        scoreLabel: '89%',
        badgeLabel: 'MASTERED',
      },
      {
        id: 'session-3',
        title: 'Human Body Lab',
        iconName: 'earth',
        dateDurationLabel: 'Yesterday | 22 min',
        scoreLabel: '11/15',
        badgeLabel: 'PASSING',
      },
    ],
  },
  {
    id: 'child-sarah',
    name: 'Sarah',
    gradeLabel: '2nd Grade',
    avatarId: 'avatar-4',
    dailyMinutesUsed: 45,
    dailyLimitMinutes: 60,
    lastSevenDays: [36, 39, 42, 28, 44, 47, 45],
    weeklyInsightTopic: 'phonics blending',
    weeklyInsightBody: 'Sarah responds well to shorter language tasks and shows higher confidence after guided practice with read-aloud prompts.',
    weeklyInsightRecommendation: 'Suggesting two short literacy bursts instead of one longer session.',
    subjectMastery: [
      { id: 'math', label: 'Mathematics', percent: 73 },
      { id: 'english', label: 'English Literacy', percent: 67 },
      { id: 'science', label: 'Natural Science', percent: 78 },
    ],
    overallPercent: 72,
    recentSessions: [
      {
        id: 'session-1',
        title: 'Number Bonds',
        iconName: 'sigma',
        dateDurationLabel: 'Today | 12 min',
        scoreLabel: '9/10',
        badgeLabel: 'EXCELLENT',
      },
      {
        id: 'session-2',
        title: 'Vocabulary Test',
        iconName: 'alphabetical-variant',
        dateDurationLabel: 'Yesterday | 10 min',
        scoreLabel: '14/20',
        badgeLabel: 'PASSING',
      },
      {
        id: 'session-3',
        title: 'World Map Exploration',
        iconName: 'earth',
        dateDurationLabel: 'Yesterday | 17 min',
        scoreLabel: '100%',
        badgeLabel: 'MASTERED',
      },
    ],
  },
] as const;

function masteryColor(percent: number): string {
  if (percent >= 90) {
    return Colors.success;
  }

  if (percent >= 70) {
    return Colors.primary;
  }

  return Colors.accentAmber;
}

function overallTone(percent: number): string {
  if (percent >= 90) {
    return Colors.success;
  }

  if (percent >= 70) {
    return Colors.primary;
  }

  return Colors.accentAmber;
}

function badgeColor(label: SessionItem['badgeLabel']): string {
  if (label === 'EXCELLENT') {
    return Colors.success;
  }

  if (label === 'MASTERED') {
    return Colors.primary;
  }

  return Colors.accentAmber;
}

function buildProgressChildren(params: {
  childProfile: ChildProfile | null;
  getAvatarSource: (avatarId: string) => ImageSourcePropType;
}): ProgressChildData[] {
  const activeChildName = params.childProfile?.nickname ?? params.childProfile?.name ?? 'Leo';
  const activeDailyLimitMinutes = params.childProfile?.rules?.dailyLimitMinutes ?? 60;

  const primaryChild: ProgressChildData = {
    id: params.childProfile?.id ?? 'child-leo',
    name: activeChildName,
    gradeLabel: params.childProfile?.gradeLevel ?? '3rd Grade',
    avatarSource: params.getAvatarSource(params.childProfile?.avatarId ?? 'avatar-1'),
    dailyMinutesUsed: params.childProfile?.dailyCompletedMinutes ?? 45,
    dailyLimitMinutes: activeDailyLimitMinutes,
    lastSevenDays: [30, 34, 41, 38, 43, 47, 45],
    weeklyInsightTopic: 'multi-digit multiplication',
    weeklyInsightBody: `${activeChildName} is building confidence with multi-digit multiplication and works best when problems are broken into short guided steps.`,
    weeklyInsightRecommendation: 'Suggesting 15 minutes of focused Maths support before the next quiz session.',
    subjectMastery: [
      { id: 'math', label: 'Mathematics', percent: 85 },
      { id: 'english', label: 'English Literacy', percent: 70 },
      { id: 'science', label: 'Natural Science', percent: 92 },
    ],
    overallPercent: 78,
    recentSessions: [
      {
        id: 'session-1',
        title: 'Geometry Quiz',
        iconName: 'sigma',
        dateDurationLabel: 'Today | 16 min',
        scoreLabel: '9/10',
        badgeLabel: 'EXCELLENT',
      },
      {
        id: 'session-2',
        title: 'Vocabulary Test',
        iconName: 'alphabetical-variant',
        dateDurationLabel: 'Yesterday | 12 min',
        scoreLabel: '14/20',
        badgeLabel: 'PASSING',
      },
      {
        id: 'session-3',
        title: 'World Map Exploration',
        iconName: 'earth',
        dateDurationLabel: 'Yesterday | 21 min',
        scoreLabel: '100%',
        badgeLabel: 'MASTERED',
      },
    ],
  };

  return [
    primaryChild,
    ...SECONDARY_CHILDREN.map((child) => ({
      ...child,
      avatarSource: params.getAvatarSource(child.avatarId),
    })),
  ];
}

function UsageDonut({
  minutesUsed,
  limitMinutes,
}: {
  minutesUsed: number;
  limitMinutes: number;
}) {
  const segments = 28;
  const progress = limitMinutes > 0 ? Math.max(0, Math.min(1, minutesUsed / limitMinutes)) : 0;
  const activeSegments = Math.round(progress * segments);

  return (
    <View style={styles.donutShell}>
      {Array.from({ length: segments }).map((_, index) => {
        const rotation = (index * 360) / segments;

        return (
          <View
            key={`segment-${index}`}
            style={[
              styles.donutSegment,
              {
                transform: [{ rotate: `${rotation}deg` }, { translateY: -52 }],
                backgroundColor: index < activeSegments ? Colors.primaryDark : Colors.surfaceContainerHigh,
              },
            ]}
          />
        );
      })}

      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{minutesUsed}</Text>
        <Text style={styles.donutLabel}>Minutes Today</Text>
      </View>
    </View>
  );
}

export default function ChildProgressScreen({
  initialState,
  errorMessage = 'Progress insights are unavailable right now.',
}: ChildProgressScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const { width } = useWindowDimensions();
  const { childProfile } = useAuth();
  const { getAvatarById } = useChildProfile();

  const [viewState, setViewState] = useState<ProgressScreenState>(
    initialState ?? (childProfile ? 'ready' : 'empty')
  );

  const children = useMemo(
    () =>
      buildProgressChildren({
        childProfile,
        getAvatarSource: (avatarId) => getAvatarById(avatarId).asset,
      }),
    [childProfile, getAvatarById]
  );

  const activeChild =
    children.find((child) => child.id === params.childId) ??
    children[0];

  const isWideLayout = width >= 740;
  const remainingMinutes = Math.max(activeChild?.dailyLimitMinutes ?? 0, 0) - Math.max(activeChild?.dailyMinutesUsed ?? 0, 0);

  if (viewState === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            accessibilityLabel="Progress unavailable"
            color={Colors.errorText}
            name="alert-circle-outline"
            size={34}
          />
          <Text style={styles.feedbackTitle}>Progress dashboard paused</Text>
          <Text style={styles.feedbackBody}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading child progress"
            onPress={() => setViewState('ready')}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (viewState === 'empty' || !activeChild) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            accessibilityLabel="No progress yet"
            color={Colors.primary}
            name="chart-arc"
            size={40}
          />
          <Text style={styles.feedbackTitle}>Progress will appear after the first session</Text>
          <Text style={styles.feedbackBody}>
            Once a child completes a few learning sessions, usage charts and mastery insights will show here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (viewState === 'loading') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.loadingContent} showsVerticalScrollIndicator={false}>
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.parentHubTitle}>Parent Hub</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open parental controls"
            onPress={() => router.push(`/(tabs)/profile?childId=${encodeURIComponent(activeChild.id)}` as never)}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.iconButtonPressed : null]}
          >
            <MaterialCommunityIcons accessibilityLabel="Settings" color={Colors.text} name="cog-outline" size={20} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIdentity}>
            <View style={styles.heroAvatarWrap}>
              <Image contentFit="cover" source={activeChild.avatarSource} style={styles.heroAvatar} />
              <View style={styles.editBadge}>
                <MaterialCommunityIcons accessibilityLabel="Edit child profile" color={Colors.white} name="pencil" size={12} />
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.screenTitle}>{activeChild.name}</Text>
              <Text style={styles.heroSubtitle}>{activeChild.gradeLabel} | Edit Profile</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ${activeChild.name} progress`}
            onPress={() =>
              router.push(`/(tabs)/chat?childId=${encodeURIComponent(activeChild.id)}` as never)
            }
            style={({ pressed }) => [styles.shareButton, pressed ? styles.shareButtonPressed : null]}
          >
            <MaterialCommunityIcons accessibilityLabel="Share progress" color={Colors.primary} name="share-variant-outline" size={18} />
            <Text style={styles.shareButtonLabel}>Share Progress</Text>
          </Pressable>
        </View>

        <View style={[styles.columnsRow, !isWideLayout ? styles.columnsRowStacked : null]}>
          <View style={[styles.leftColumn, !isWideLayout ? styles.fullWidthColumn : null]}>
            <View style={styles.surfaceCard}>
              <Text style={styles.sectionTitle}>Daily Usage</Text>
              <UsageDonut limitMinutes={activeChild.dailyLimitMinutes} minutesUsed={activeChild.dailyMinutesUsed} />
              <View style={styles.usageMeta}>
                <Text style={styles.usageMetaLabel}>
                  Daily Limit: {activeChild.dailyLimitMinutes}m
                </Text>
                <Text style={styles.usageMetaLabel}>
                  Remaining: {Math.max(remainingMinutes, 0)}m
                </Text>
              </View>
            </View>

            <View style={styles.surfaceCard}>
              <Text style={styles.sectionTitle}>Last 7 Days</Text>
              <View style={styles.sparkline}>
                {activeChild.lastSevenDays.map((minutes, index) => (
                  <View key={`day-${index}`} style={styles.sparkColumn}>
                    <View
                      style={[
                        styles.sparkBar,
                        {
                          height: Math.max(18, minutes),
                          backgroundColor:
                            index === activeChild.lastSevenDays.length - 1
                              ? Colors.primary
                              : Colors.primaryFixed,
                        },
                      ]}
                    />
                    <Text style={styles.sparkLabel}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.rightColumn, !isWideLayout ? styles.fullWidthColumn : null]}>
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <MaterialCommunityIcons accessibilityLabel="Weekly insight" color={Colors.primary} name="sparkles" size={18} />
                <Text style={styles.insightKicker}>Weekly Insight</Text>
              </View>
              <Text style={styles.insightBody}>
                {activeChild.weeklyInsightBody}{' '}
                <Text
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      `/(tabs)/chat?childId=${encodeURIComponent(activeChild.id)}&topic=${encodeURIComponent(activeChild.weeklyInsightTopic)}` as never
                    )
                  }
                  style={styles.insightLink}
                >
                  {activeChild.weeklyInsightTopic}
                </Text>
                .
              </Text>
              <Text style={styles.insightRecommendation}>
                {activeChild.weeklyInsightRecommendation}
              </Text>
            </View>

            <View style={styles.surfaceCard}>
              <View style={styles.masteryHeader}>
                <Text style={styles.sectionTitle}>Subject Mastery</Text>
                <View
                  style={[
                    styles.overallBadge,
                    { backgroundColor: Colors.primaryFixed },
                  ]}
                >
                  <Text
                    style={[
                      styles.overallBadgeLabel,
                      { color: overallTone(activeChild.overallPercent) },
                    ]}
                  >
                    Overall {activeChild.overallPercent}%
                  </Text>
                </View>
              </View>

              <View style={styles.masteryList}>
                {activeChild.subjectMastery.map((subject) => (
                  <SubjectProgressBar
                    key={subject.id}
                    fillColor={masteryColor(subject.percent)}
                    label={subject.label}
                    progress={subject.percent / 100}
                    valueLabel={`${subject.percent}%`}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.surfaceCard}>
          <View style={styles.masteryHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all recent sessions"
              onPress={() => router.push(`/(tabs)/chat?childId=${encodeURIComponent(activeChild.id)}` as never)}
            >
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.sessionsList}>
            {activeChild.recentSessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionIdentity}>
                  <View style={styles.sessionIconWrap}>
                    <MaterialCommunityIcons accessibilityLabel={session.title} color={Colors.primary} name={session.iconName} size={18} />
                  </View>
                  <View style={styles.sessionCopy}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionMeta}>{session.dateDurationLabel}</Text>
                  </View>
                </View>

                <View style={styles.sessionResult}>
                  <Text style={styles.sessionScore}>{session.scoreLabel}</Text>
                  <Text style={[styles.sessionBadge, { color: badgeColor(session.badgeLabel) }]}>
                    {session.badgeLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export detailed progress PDF"
          onPress={() => router.push(`/(tabs)/chat?childId=${encodeURIComponent(activeChild.id)}` as never)}
          style={({ pressed }) => [styles.exportWrapper, pressed ? styles.exportPressed : null]}
        >
          <LinearGradient
            colors={[...Gradients.indigoDepth.colors]}
            end={Gradients.indigoDepth.end}
            start={Gradients.indigoDepth.start}
            style={styles.exportGradient}
          >
            <MaterialCommunityIcons accessibilityLabel="Export PDF" color={Colors.white} name="file-pdf-box" size={20} />
            <Text style={styles.exportLabel}>Export Detailed Progress PDF {'->'}</Text>
          </LinearGradient>
        </Pressable>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  parentHubTitle: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroAvatarWrap: {
    position: 'relative',
  },
  heroAvatar: {
    width: 84,
    height: 84,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  editBadge: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  screenTitle: {
    ...Typography.headline,
    color: Colors.text,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  shareButton: {
    minHeight: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  shareButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  shareButtonLabel: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  columnsRowStacked: {
    flexDirection: 'column',
  },
  leftColumn: {
    width: '35%',
    gap: Spacing.md,
  },
  rightColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  fullWidthColumn: {
    width: '100%',
  },
  surfaceCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  donutShell: {
    width: 144,
    height: 144,
    alignSelf: 'center',
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSegment: {
    position: 'absolute',
    width: 8,
    height: 18,
    borderRadius: Radii.full,
  },
  donutCenter: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  donutValue: {
    ...Typography.headline,
    color: Colors.text,
  },
  donutLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  usageMeta: {
    gap: Spacing.xs,
    alignItems: 'center',
  },
  usageMetaLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sparkColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sparkBar: {
    width: '100%',
    borderRadius: Radii.full,
  },
  sparkLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  insightCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.primaryFixed,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  insightKicker: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  insightBody: {
    ...Typography.body,
    color: Colors.text,
  },
  insightLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  insightRecommendation: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  masteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  overallBadge: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  overallBadgeLabel: {
    ...Typography.captionMedium,
  },
  masteryList: {
    gap: Spacing.md,
  },
  viewAllLink: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  sessionsList: {
    gap: Spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sessionIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCopy: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  sessionMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  sessionResult: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  sessionScore: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  sessionBadge: {
    ...Typography.label,
    letterSpacing: 0.3,
  },
  exportWrapper: {
    borderRadius: Radii.full,
    overflow: 'hidden',
    ...Shadows.button,
  },
  exportPressed: {
    transform: [{ scale: 0.99 }],
  },
  exportGradient: {
    minHeight: 56,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  exportLabel: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  feedbackState: {
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
  retryButton: {
    minHeight: 48,
    minWidth: 144,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  retryLabel: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  loadingContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  loadingCard: {
    height: 184,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
