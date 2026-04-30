import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getChildTabSceneBottomPadding } from '@/components/navigation/bottomNavTokens';
import { Colors, Gradients, Shadows } from '@/constants/theme';

type ChildScreen = 'home' | 'badges' | 'profile';
type BadgeFilter = 'all' | 'recent' | 'subjects' | 'special';

interface KidsMindChildExperienceProps {
  initialScreen?: ChildScreen;
}

interface SubjectCardItem {
  name: string;
  lessons: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
}

interface TrophyItem {
  title: string;
  icon: string;
  backgroundColor: string;
  iconColor: string;
  locked?: boolean;
}

interface StatItem {
  label: string;
  value: string;
  icon: string;
  iconColor: string;
  valueColor?: string;
  selected?: boolean;
}

interface SubjectProgressItem {
  name: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  percentage: number;
  percentageColor: string;
  fillColor: string;
}

interface RecentBadgeItem {
  label: string;
  icon: string;
  backgroundColor: string;
}

const SCREEN_BG = Colors.surface;
const CARD_BG = Colors.surfaceContainerLowest;
const AVATAR_BG = Colors.primary;

const homeSubjects: SubjectCardItem[] = [
  {
    name: 'Maths',
    lessons: '8 Lessons done',
    icon: 'calculator-variant-outline',
    iconColor: '#4338CA',
    iconBackground: '#EEF2FF',
  },
  {
    name: 'Science',
    lessons: '6 Lessons done',
    icon: 'microscope',
    iconColor: '#059669',
    iconBackground: '#ECFDF5',
  },
  {
    name: 'English',
    lessons: '5 Lessons done',
    icon: 'book-open-variant',
    iconColor: '#D97706',
    iconBackground: '#FFFBEB',
  },
  {
    name: 'French',
    lessons: '4 Lessons done',
    icon: 'translate',
    iconColor: '#7C3AED',
    iconBackground: '#F5F3FF',
  },
  {
    name: 'History',
    lessons: '3 Lessons done',
    icon: 'history',
    iconColor: '#92400E',
    iconBackground: '#FEF3C7',
  },
  {
    name: 'Art',
    lessons: '7 Lessons done',
    icon: 'palette-outline',
    iconColor: '#EC4899',
    iconBackground: '#FDF2F8',
  },
];

const unlockedTrophies: TrophyItem[] = [
  {
    title: 'MATH STAR',
    icon: 'calculator-variant-outline',
    backgroundColor: '#F59E0B',
    iconColor: '#FFFFFF',
  },
  {
    title: 'SCIENCE EXPLORER',
    icon: 'microscope',
    backgroundColor: '#8B5CF6',
    iconColor: '#FFFFFF',
  },
  {
    title: 'WORD WIZARD',
    icon: 'book-open-variant',
    backgroundColor: '#EC4899',
    iconColor: '#FFFFFF',
  },
];

const lockedTrophies: TrophyItem[] = [
  {
    title: 'WORLD TRAVELER',
    icon: 'earth',
    backgroundColor: '#D1D5DB',
    iconColor: '#9CA3AF',
    locked: true,
  },
  {
    title: 'MASTER ARTIST',
    icon: 'palette-outline',
    backgroundColor: '#D1D5DB',
    iconColor: '#9CA3AF',
    locked: true,
  },
  {
    title: 'MELODY MAKER',
    icon: 'music-note',
    backgroundColor: '#D1D5DB',
    iconColor: '#9CA3AF',
    locked: true,
  },
];

const profileStats: StatItem[] = [
  {
    label: 'TOTAL XP',
    value: '1,250',
    icon: 'star-outline',
    iconColor: '#6D28D9',
  },
  {
    label: 'BADGES',
    value: '12',
    icon: 'trophy',
    iconColor: '#D97706',
    selected: true,
  },
  {
    label: 'EXERCISES',
    value: '45',
    icon: 'check-circle-outline',
    iconColor: '#6D28D9',
  },
  {
    label: 'DAY STREAK',
    value: '12',
    icon: 'fire',
    iconColor: '#DC2626',
    valueColor: '#DC2626',
  },
];

const subjectProgress: SubjectProgressItem[] = [
  {
    name: 'Maths',
    icon: 'calculator-variant-outline',
    iconColor: '#4338CA',
    iconBackground: '#EEF2FF',
    percentage: 70,
    percentageColor: '#312E81',
    fillColor: '#312E81',
  },
  {
    name: 'English',
    icon: 'book-open-variant',
    iconColor: '#D97706',
    iconBackground: '#FFFBEB',
    percentage: 40,
    percentageColor: '#D97706',
    fillColor: '#D97706',
  },
  {
    name: 'Science',
    icon: 'flask-outline',
    iconColor: '#DC2626',
    iconBackground: '#FEF2F2',
    percentage: 90,
    percentageColor: '#7F1D1D',
    fillColor: '#991B1B',
  },
];

const recentBadges: RecentBadgeItem[] = [
  {
    label: 'FIRST LAUNCH',
    icon: 'rocket-launch-outline',
    backgroundColor: '#F59E0B',
  },
  {
    label: 'PROBLEM SOLVER',
    icon: 'cog-outline',
    backgroundColor: '#7C3AED',
  },
  {
    label: '10 DAY STREAK',
    icon: 'trophy',
    backgroundColor: '#EC4899',
  },
  {
    label: 'ARTISTIC MIND',
    icon: 'palette-outline',
    backgroundColor: '#D97706',
  },
  {
    label: 'ECO HERO',
    icon: 'earth',
    backgroundColor: '#6D28D9',
  },
];

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  return <MaterialCommunityIcons name={name as never} size={size} color={color} />;
}

function HomeDashboardView({ onViewAll, onTalk }: { onViewAll: () => void; onTalk: () => void }) {
  return (
    <View style={styles.homeScreenRoot}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeScrollContent}>
        <View style={styles.notificationBanner}>
          <Text style={styles.notificationText}>New Badge: Space Cadet 🏅</Text>
          <Icon name="magnify" size={20} color={Colors.text} />
        </View>

        <View style={styles.screenInnerPadding}>
          <View style={styles.topCardsRow}>
            <View style={styles.progressCard}>
              <Text style={styles.metaLabel}>YOUR PROGRESS</Text>
              <View style={styles.progressSummaryRow}>
                <Text style={styles.levelValue}>Level 5</Text>
                <Text style={styles.xpCaption}>1,250 / 1,500 XP</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '83%', backgroundColor: Colors.primaryDark }]} />
              </View>
            </View>

            <View style={styles.streakCard}>
              <View style={styles.streakTopRow}>
                <Text style={styles.streakMetaLabel}>DAILY STREAK</Text>
                <View style={styles.streakFlameWrap}>
                  <Icon name="fire" size={16} color={Colors.white} />
                </View>
              </View>
              <Text style={styles.streakValue}>5 Day Streak! 🔥</Text>
            </View>
          </View>

          <LinearGradient colors={[...Gradients.indigoDepth.colors]} start={Gradients.indigoDepth.start} end={Gradients.indigoDepth.end} style={styles.featuredCard}>
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>SCIENCE + SPACE</Text>
            </View>
            <Text style={styles.featuredTitle}>Solar Systems</Text>
            <Text style={styles.featuredSubtitle}>
              You're halfway through! Discover why Saturn has those beautiful rings today.
            </Text>
            <Pressable style={styles.resumeButton}>
              <Text style={styles.resumeButtonText}>Resume ▶</Text>
            </Pressable>

            <View style={styles.spaceArtWrap}>
              <View style={styles.saturnBody} />
              <View style={styles.saturnRing} />
              <View style={styles.spaceMoon} />
              <Icon name="star-four-points" size={14} color="rgba(255,255,255,0.65)" />
            </View>
          </LinearGradient>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Choose a Subject</Text>
            <Pressable onPress={onViewAll}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.subjectGrid}>
            {homeSubjects.map((subject) => (
              <View key={subject.name} style={styles.subjectCard}>
                <View style={[styles.subjectIconWrap, { backgroundColor: subject.iconBackground }]}>
                  <Icon name={subject.icon} size={26} color={subject.iconColor} />
                </View>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectLessonText}>{subject.lessons}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.talkButton} onPress={onTalk}>
        <Icon name="chat-processing-outline" size={18} color={Colors.white} />
        <Text style={styles.talkButtonText}>Talk to KidsMind</Text>
      </Pressable>
    </View>
  );
}

function TrophyCard({ item }: { item: TrophyItem }) {
  return (
    <View style={styles.trophyCard}>
      <View style={styles.trophyCircleWrap}>
        <View style={[styles.trophyCircle, { backgroundColor: item.backgroundColor }]}>
          <Icon name={item.icon} size={30} color={item.iconColor} />
        </View>
        {item.locked ? (
          <View style={styles.lockBadge}>
            <Icon name="lock" size={10} color={Colors.white} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.trophyLabel, item.locked ? styles.trophyLabelLocked : null]}>{item.title}</Text>
    </View>
  );
}

function BadgeGalleryView({ activeFilter, onFilterChange }: { activeFilter: BadgeFilter; onFilterChange: (filter: BadgeFilter) => void }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.badgeScrollContent}>
      <View style={styles.profileHeaderRow}>
        <View style={styles.profileIdentityWrap}>
          <View style={styles.profileAvatarSmall}>
            <Text style={styles.profileAvatarInitials}>GP</Text>
          </View>
          <Text style={styles.profileHeaderName}>Gentle Polymath</Text>
        </View>
        <Icon name="cog-outline" size={22} color={Colors.textTertiary} />
      </View>

      <View style={styles.streakBannerCard}>
        <View style={styles.streakBannerTopRow}>
          <Text style={styles.streakBannerTitle}>🔥 12-day streak!</Text>
          <Pressable>
            <Text style={styles.streakBannerLink}>History</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {[
            { day: 'M', state: 'done' },
            { day: 'T', state: 'done' },
            { day: 'W', state: 'done' },
            { day: 'T', state: 'done' },
            { day: 'F', state: 'done' },
            { day: 'S', state: 'today' },
            { day: 'S', state: 'empty' },
          ].map((item, index) => (
            <View key={`${item.day}-${index}`} style={styles.weekDayColumn}>
              <Text style={styles.weekDayLabel}>{item.day}</Text>
              <View
                style={[
                  styles.weekDayCircle,
                  item.state === 'done' ? styles.weekDayCircleDone : null,
                  item.state === 'today' ? styles.weekDayCircleToday : null,
                  item.state === 'empty' ? styles.weekDayCircleEmpty : null,
                ]}
              >
      {item.state === 'done' ? <Icon name="check" size={15} color={Colors.white} /> : null}
      {item.state === 'today' ? <Icon name="lightning-bolt" size={15} color={Colors.white} /> : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
        <Pressable
          onPress={() => onFilterChange('all')}
          style={[styles.filterPill, activeFilter === 'all' ? styles.filterPillActive : styles.filterPillInactive]}
        >
          <Text style={[styles.filterPillText, activeFilter === 'all' ? styles.filterPillTextActive : null]}>All</Text>
        </Pressable>
        <Pressable
          onPress={() => onFilterChange('recent')}
          style={[styles.filterPill, activeFilter === 'recent' ? styles.filterPillActive : styles.filterPillInactive]}
        >
          <Text style={[styles.filterPillText, activeFilter === 'recent' ? styles.filterPillTextActive : null]}>
            Recent
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onFilterChange('subjects')}
          style={[styles.filterPill, activeFilter === 'subjects' ? styles.filterPillActive : styles.filterPillInactive]}
        >
          <Text style={[styles.filterPillText, activeFilter === 'subjects' ? styles.filterPillTextActive : null]}>
            Subjects
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onFilterChange('special')}
          style={[styles.filterPill, activeFilter === 'special' ? styles.filterPillActive : styles.filterPillInactive]}
        >
          <Text style={[styles.filterPillText, activeFilter === 'special' ? styles.filterPillTextActive : null]}>
            Special
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.collectibleHeaderRow}>
        <Text style={styles.collectibleHeaderTitle}>Collectible Trophies</Text>
        <Text style={styles.collectibleHeaderCount}>12 / 48 Unlocked</Text>
      </View>

      <View style={styles.trophyGrid}>
        {unlockedTrophies.map((item) => (
          <TrophyCard key={item.title} item={item} />
        ))}
      </View>

      <View style={styles.trophyGrid}>
        {lockedTrophies.map((item) => (
          <TrophyCard key={item.title} item={item} />
        ))}
      </View>

      <View style={styles.assistantCard}>
        <View style={styles.assistantTopRow}>
          <View style={styles.assistantBrandRow}>
            <View style={styles.assistantIconBubble}>
              <Icon name="plus" size={18} color={Colors.white} />
            </View>
            <Text style={styles.assistantTitle}>Polymath Assistant</Text>
          </View>
          <View style={styles.assistantSparklesWrap}>
      <Icon name="star-four-points" size={13} color={Colors.primaryFixed} />
      <Icon name="star-four-points" size={9} color={Colors.primaryFixed} />
      <Icon name="star-four-points" size={11} color={Colors.primaryFixed} />
          </View>
        </View>

        <Text style={styles.assistantBodyText}>
          <Text style={styles.assistantBodyItalic}>You're only </Text>
          <Text style={styles.assistantBodyHighlight}>3 Science lessons</Text>
          <Text style={styles.assistantBodyItalic}>
            {' '}
            away from unlocking the "Space Voyager" badge! Want to start now?
          </Text>
        </Text>

        <Pressable style={styles.assistantButton}>
          <Text style={styles.assistantButtonText}>Let's Explore</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCard({ item }: { item: StatItem }) {
  return (
    <View style={[styles.statCard, item.selected ? styles.statCardSelected : null]}>
      <Icon name={item.icon} size={26} color={item.iconColor} />
      <Text style={[styles.statValue, item.valueColor ? { color: item.valueColor } : null]}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );
}

function ProfileHubView() {
  const insets = useSafeAreaInsets();
  const childTabSceneBottomPadding = getChildTabSceneBottomPadding(insets.bottom);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.profileScrollContent, { paddingBottom: childTabSceneBottomPadding }]}
    >
      <View style={styles.profileHeaderRow}>
        <View style={styles.profileIdentityWrap}>
          <View style={styles.profileAvatarSmall}>
            <Text style={styles.profileAvatarInitials}>GP</Text>
          </View>
          <Text style={styles.profileHeaderName}>Gentle Polymath</Text>
        </View>
        <Icon name="cog-outline" size={22} color={Colors.textTertiary} />
      </View>

      <LinearGradient colors={[...Gradients.indigoDepth.colors]} start={Gradients.indigoDepth.start} end={Gradients.indigoDepth.end} style={styles.profileHero}>
        <View style={styles.heroAvatarOuter}>
          <View style={styles.heroAvatarInner}>
            <Icon name="account" size={44} color={Colors.primaryDark} />
          </View>
        </View>
        <View style={styles.heroLevelPill}>
          <Text style={styles.heroLevelText}>LVL 14</Text>
        </View>
        <Text style={styles.heroName}>Little Explorer</Text>
        <Text style={styles.heroSubtitle}>Curiosity is your superpower!</Text>
      </LinearGradient>

      <View style={styles.statCardsRow}>
        {profileStats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </View>

      <View style={styles.subjectProgressSection}>
        <View style={styles.subjectProgressHeadingRow}>
          <Text style={styles.sectionTitle}>Subject Progress</Text>
          <View style={styles.headingDot} />
        </View>

        {subjectProgress.map((subject) => (
          <View key={subject.name} style={styles.subjectProgressCard}>
            <View style={styles.subjectProgressTopRow}>
              <View style={[styles.subjectProgressIconWrap, { backgroundColor: subject.iconBackground }]}>
                <Icon name={subject.icon} size={20} color={subject.iconColor} />
              </View>
              <Text style={styles.subjectProgressName}>{subject.name}</Text>
              <Text style={[styles.subjectProgressPercent, { color: subject.percentageColor }]}>{subject.percentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${subject.percentage}%`, backgroundColor: subject.fillColor }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.recentBadgesHeadingRow}>
        <Text style={styles.sectionTitle}>Recent Badges</Text>
        <Pressable>
          <Text style={styles.viewAllLinkSmall}>View all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentBadgesRow}>
        {recentBadges.map((badge) => (
          <View key={badge.label} style={styles.recentBadgeItem}>
            <View style={[styles.recentBadgeCircle, { backgroundColor: badge.backgroundColor }]}>
              <Icon name={badge.icon} size={25} color={Colors.white} />
            </View>
            <Text style={styles.recentBadgeLabel}>{badge.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.weeklyInsightCard}>
        <View style={styles.weeklyInsightIconWrap}>
          <Icon name="star-four-points" size={22} color={Colors.white} />
        </View>
        <View style={styles.weeklyInsightBodyWrap}>
          <Text style={styles.weeklyInsightTitle}>Weekly Insight</Text>
          <Text style={styles.weeklyInsightText}>
            Amazing work, Little Explorer! You've learned 3 new topics this week! You're becoming a true master of
            Science.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function KidsMindChildExperience({ initialScreen = 'home' }: KidsMindChildExperienceProps) {
  const activeScreen = initialScreen;
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>('all');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.activeScreenSurface}>
        {activeScreen === 'home' ? (
          <HomeDashboardView
            onViewAll={() => router.push('/(child-tabs)/badges' as never)}
            onTalk={() => {
              // SECURITY: Child chat opens in child tabs; parent chat history is PIN-gated.
              router.push('/(child-tabs)/chat' as never);
            }}
          />
        ) : null}
        {activeScreen === 'badges' ? (
          <BadgeGalleryView activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        ) : null}
        {activeScreen === 'profile' ? <ProfileHubView /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  activeScreenSurface: {
    flex: 1,
  },
  homeScreenRoot: {
    flex: 1,
  },
  homeScrollContent: {
    paddingBottom: 108,
  },
  notificationBanner: {
    minHeight: 40,
    backgroundColor: Colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  notificationText: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  screenInnerPadding: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  topCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressCard: {
    flex: 1.25,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  metaLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.88,
  },
  progressSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelValue: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    lineHeight: 28,
  },
  xpCaption: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  streakCard: {
    flex: 0.95,
    backgroundColor: Colors.tertiaryContainer,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    minHeight: 122,
  },
  streakTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakMetaLabel: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  streakFlameWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    color: Colors.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    lineHeight: 26,
  },
  featuredCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 188,
    overflow: 'hidden',
  },
  featuredTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredTagText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.7,
  },
  featuredTitle: {
    color: Colors.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 26,
    lineHeight: 30,
    marginTop: 8,
    maxWidth: '72%',
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: '72%',
  },
  resumeButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resumeButtonText: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  spaceArtWrap: {
    position: 'absolute',
    right: -8,
    top: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: 126,
    height: 126,
    gap: 8,
  },
  saturnBody: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(165,180,252,0.46)',
  },
  saturnRing: {
    position: 'absolute',
    width: 92,
    height: 30,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(199,210,254,0.78)',
    transform: [{ rotate: '-20deg' }],
  },
  spaceMoon: {
    position: 'absolute',
    top: 8,
    right: 22,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  viewAllLink: {
    color: Colors.link,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: -2,
  },
  subjectCard: {
    width: '31.5%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  subjectIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    marginTop: 10,
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  subjectLessonText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  talkButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Shadows.button,
  },
  talkButtonText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  badgeScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  profileIdentityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  profileHeaderName: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  streakBannerCard: {
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  streakBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakBannerTitle: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  streakBannerLink: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekDayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  weekDayLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleDone: {
    backgroundColor: Colors.secondaryContainer,
  },
  weekDayCircleToday: {
    backgroundColor: Colors.primary,
  },
  weekDayCircleEmpty: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillInactive: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.outline,
  },
  filterPillText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  collectibleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  collectibleHeaderTitle: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  collectibleHeaderCount: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  trophyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  trophyCard: {
    width: '31.5%',
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trophyCircleWrap: {
    position: 'relative',
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyLabel: {
    marginTop: 10,
    textAlign: 'center',
    color: Colors.textTertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  trophyLabelLocked: {
    color: Colors.textTertiary,
  },
  assistantCard: {
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 4,
    marginBottom: 2,
    gap: 14,
  },
  assistantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  assistantBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assistantIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  assistantSparklesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assistantBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantBodyItalic: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
  },
  assistantBodyHighlight: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  assistantButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantButtonText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  profileScrollContent: {
    flexGrow: 1,
    gap: 16,
  },
  profileHero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 30,
    alignItems: 'center',
  },
  heroAvatarOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLevelPill: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroLevelText: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  heroName: {
    marginTop: 12,
    color: Colors.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    lineHeight: 30,
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  statCardsRow: {
    marginTop: -20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardSelected: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  statValue: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    lineHeight: 22,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subjectProgressSection: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 2,
  },
  subjectProgressHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  subjectProgressCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  subjectProgressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subjectProgressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectProgressName: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  subjectProgressPercent: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  recentBadgesHeadingRow: {
    paddingHorizontal: 16,
    marginTop: -2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllLinkSmall: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  recentBadgesRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 2,
  },
  recentBadgeItem: {
    width: 64,
    alignItems: 'center',
  },
  recentBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBadgeLabel: {
    marginTop: 6,
    color: Colors.textTertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.45,
    textAlign: 'center',
  },
  weeklyInsightCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  weeklyInsightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyInsightBodyWrap: {
    flex: 1,
    gap: 4,
  },
  weeklyInsightTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  weeklyInsightText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
