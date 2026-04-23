import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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

import { LabeledToggleRow } from '@/components/ui/LabeledToggleRow';
import { Colors, Gradients, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import type { ChildProfile } from '@/types/child';

type ControlsScreenState = 'loading' | 'ready' | 'error' | 'empty';

interface SubjectToggleItem {
  id: string;
  label: string;
  enabled: boolean;
}

interface AlertPreference {
  id: string;
  title: string;
  description: string;
  iconName: 'clock-outline' | 'flag-outline';
  enabled: boolean;
}

interface ControlChildData {
  id: string;
  name: string;
  ageLabel: string;
  gradeLabel: string;
  avatarSource: ImageSourcePropType;
  dailyAllowanceMinutes: number;
  activeWindowStart: string;
  activeWindowEnd: string;
  pauseAccessEnabled: boolean;
  curriculum: SubjectToggleItem[];
  homeworkModeEnabled: boolean;
  safetyLevelLabel: string;
  safetySubtitle: string;
  micAccessEnabled: boolean;
  audioStorageEnabled: boolean;
  alertPreferences: AlertPreference[];
  auditLoggedAt: string;
}

export interface ParentalControlsScreenProps {
  initialState?: ControlsScreenState;
  errorMessage?: string;
}

const ADDITIONAL_CHILDREN = [
  {
    id: 'child-maya',
    name: 'Maya',
    ageLabel: 'Age 10',
    gradeLabel: '5th Grade',
    avatarId: 'avatar-2',
    dailyAllowanceMinutes: 120,
    activeWindowStart: '08:00',
    activeWindowEnd: '20:00',
    pauseAccessEnabled: false,
    curriculum: [
      { id: 'maths', label: 'Maths', enabled: true },
      { id: 'french', label: 'French', enabled: true },
      { id: 'science', label: 'Science', enabled: false },
    ],
    homeworkModeEnabled: true,
    safetyLevelLabel: 'Strict',
    safetySubtitle: 'Content is strictly filtered for Maya age 10',
    micAccessEnabled: true,
    audioStorageEnabled: false,
    alertPreferences: [
      {
        id: 'limit',
        title: 'Limit alerts',
        description: 'Get notified when Maya is near her daily limit.',
        iconName: 'clock-outline',
        enabled: true,
      },
      {
        id: 'flagged',
        title: 'Flagged content',
        description: 'Immediate alert if filtered keywords are used.',
        iconName: 'flag-outline',
        enabled: true,
      },
    ],
    auditLoggedAt: 'Today, 6:21 PM',
  },
  {
    id: 'child-sarah',
    name: 'Sarah',
    ageLabel: 'Age 8',
    gradeLabel: '2nd Grade',
    avatarId: 'avatar-4',
    dailyAllowanceMinutes: 60,
    activeWindowStart: '09:00',
    activeWindowEnd: '18:00',
    pauseAccessEnabled: false,
    curriculum: [
      { id: 'maths', label: 'Maths', enabled: true },
      { id: 'french', label: 'French', enabled: false },
      { id: 'science', label: 'Science', enabled: true },
    ],
    homeworkModeEnabled: false,
    safetyLevelLabel: 'Strict',
    safetySubtitle: 'Content is strictly filtered for Sarah age 8',
    micAccessEnabled: true,
    audioStorageEnabled: false,
    alertPreferences: [
      {
        id: 'limit',
        title: 'Limit alerts',
        description: 'Get notified when Sarah is near her daily limit.',
        iconName: 'clock-outline',
        enabled: true,
      },
      {
        id: 'flagged',
        title: 'Flagged content',
        description: 'Immediate alert if filtered keywords are used.',
        iconName: 'flag-outline',
        enabled: true,
      },
    ],
    auditLoggedAt: 'Today, 4:05 PM',
  },
] as const;

const DAILY_ALLOWANCE_OPTIONS = [45, 60, 90, 120, 150, 180];

function minutesToLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

function timeToOffset(time: string): number {
  const [hoursValue, minutesValue] = time.split(':').map(Number);
  return (hoursValue + minutesValue / 60) / 24;
}

function buildChildrenData(params: {
  childProfile: ChildProfile | null;
  getAvatarSource: (avatarId: string) => ImageSourcePropType;
}): ControlChildData[] {
  const activeChildName = params.childProfile?.nickname ?? params.childProfile?.name ?? 'Leo';
  const activeChildAge = params.childProfile?.age ?? 9;
  const activeChildRules = params.childProfile?.rules;

  const primaryChild: ControlChildData = {
    id: params.childProfile?.id ?? 'child-leo',
    name: activeChildName,
    ageLabel: `Age ${activeChildAge}`,
    gradeLabel: params.childProfile?.gradeLevel ?? '3rd Grade',
    avatarSource: params.getAvatarSource(params.childProfile?.avatarId ?? 'avatar-1'),
    dailyAllowanceMinutes: activeChildRules?.dailyLimitMinutes ?? 90,
    activeWindowStart: activeChildRules?.timeWindowStart ?? '08:00',
    activeWindowEnd: activeChildRules?.timeWindowEnd ?? '20:00',
    pauseAccessEnabled: false,
    curriculum: [
      { id: 'maths', label: 'Maths', enabled: true },
      { id: 'french', label: 'French', enabled: true },
      { id: 'science', label: 'Science', enabled: false },
    ],
    homeworkModeEnabled: activeChildRules?.homeworkModeEnabled ?? true,
    safetyLevelLabel: 'Strict',
    safetySubtitle: `Content is strictly filtered for ${activeChildName} age ${activeChildAge}`,
    micAccessEnabled: activeChildRules?.voiceModeEnabled ?? true,
    audioStorageEnabled: activeChildRules?.audioStorageEnabled ?? false,
    alertPreferences: [
      {
        id: 'limit',
        title: 'Limit alerts',
        description: `Get notified when ${activeChildName} is near the daily limit.`,
        iconName: 'clock-outline',
        enabled: true,
      },
      {
        id: 'flagged',
        title: 'Flagged content',
        description: 'Immediate alert if filtered keywords are used.',
        iconName: 'flag-outline',
        enabled: true,
      },
    ],
    auditLoggedAt: 'Today, 7:08 PM',
  };

  return [
    primaryChild,
    ...ADDITIONAL_CHILDREN.map((child) => ({
      ...child,
      avatarSource: params.getAvatarSource(child.avatarId),
    })),
  ];
}

function SectionHeader({
  iconName,
  title,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons accessibilityLabel={title} color={Colors.primary} name={iconName} size={18} />
      <Text style={styles.sectionHeaderLabel}>{title}</Text>
    </View>
  );
}

function SteppedSlider({
  options,
  value,
  onChange,
}: {
  options: number[];
  value: number;
  onChange: (nextValue: number) => void;
}) {
  const activeIndex = Math.max(0, options.findIndex((option) => option === value));
  const fillPercent = options.length > 1 ? activeIndex / (options.length - 1) : 0;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrackBase} />
      <View style={[styles.sliderFill, { width: `${fillPercent * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${fillPercent * 100}%` }]} />

      <View style={styles.sliderTapTargets}>
        {options.map((option, index) => (
          <Pressable
            key={option}
            accessibilityRole="adjustable"
            accessibilityLabel={`Set allowance to ${minutesToLabel(option)}`}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.sliderTapTarget,
              pressed ? styles.sliderTapTargetPressed : null,
            ]}
          >
            <View style={[styles.sliderDot, index <= activeIndex ? styles.sliderDotActive : null]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ParentalControlsScreen({
  initialState,
  errorMessage = 'Controls could not be loaded right now.',
}: ParentalControlsScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { childProfile } = useAuth();
  const { getAvatarById } = useChildProfile();
  const params = useLocalSearchParams<{ childId?: string }>();

  const [viewState, setViewState] = useState<ControlsScreenState>(
    initialState ?? (childProfile ? 'ready' : 'empty')
  );

  const children = useMemo(
    () =>
      buildChildrenData({
        childProfile,
        getAvatarSource: (avatarId) => getAvatarById(avatarId).asset,
      }),
    [childProfile, getAvatarById]
  );

  const activeChild =
    children.find((child) => child.id === params.childId) ??
    children[0];

  const [dailyAllowanceMinutes, setDailyAllowanceMinutes] = useState(activeChild?.dailyAllowanceMinutes ?? 90);
  const [pauseAccessEnabled, setPauseAccessEnabled] = useState(activeChild?.pauseAccessEnabled ?? false);
  const [curriculum, setCurriculum] = useState(activeChild?.curriculum ?? []);
  const [homeworkModeEnabled, setHomeworkModeEnabled] = useState(activeChild?.homeworkModeEnabled ?? true);
  const [micAccessEnabled, setMicAccessEnabled] = useState(activeChild?.micAccessEnabled ?? true);
  const [audioStorageEnabled, setAudioStorageEnabled] = useState(activeChild?.audioStorageEnabled ?? false);
  const [alertPreferences, setAlertPreferences] = useState(activeChild?.alertPreferences ?? []);

  const isWideLayout = width >= 720;
  const windowStart = timeToOffset(activeChild?.activeWindowStart ?? '08:00');
  const windowEnd = timeToOffset(activeChild?.activeWindowEnd ?? '20:00');

  useEffect(() => {
    if (!activeChild) {
      return;
    }

    setDailyAllowanceMinutes(activeChild.dailyAllowanceMinutes);
    setPauseAccessEnabled(activeChild.pauseAccessEnabled);
    setCurriculum(activeChild.curriculum);
    setHomeworkModeEnabled(activeChild.homeworkModeEnabled);
    setMicAccessEnabled(activeChild.micAccessEnabled);
    setAudioStorageEnabled(activeChild.audioStorageEnabled);
    setAlertPreferences(activeChild.alertPreferences);
  }, [activeChild]);

  function toggleSubject(subjectId: string) {
    setCurriculum((current) =>
      current.map((subject) =>
        subject.id === subjectId ? { ...subject, enabled: !subject.enabled } : subject
      )
    );
  }

  function toggleAlert(alertId: string) {
    setAlertPreferences((current) =>
      current.map((alert) =>
        alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
      )
    );
  }

  if (viewState === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            accessibilityLabel="Controls unavailable"
            color={Colors.errorText}
            name="alert-circle-outline"
            size={34}
          />
          <Text style={styles.feedbackTitle}>Parent controls paused</Text>
          <Text style={styles.feedbackBody}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading parental controls"
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
            accessibilityLabel="No child selected"
            color={Colors.primary}
            name="account-child-circle"
            size={40}
          />
          <Text style={styles.feedbackTitle}>Choose a child to manage settings</Text>
          <Text style={styles.feedbackBody}>
            Add or select a child profile from the overview dashboard to start managing safety boundaries.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to overview"
            onPress={() => router.push('/(tabs)' as never)}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}
          >
            <Text style={styles.retryLabel}>Back to Overview</Text>
          </Pressable>
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
          <View style={styles.heroCopy}>
            <Text style={styles.screenTitle}>Settings for {firstName(activeChild.name)}</Text>
            <Text style={styles.heroSubtitle}>Manage learning preferences and safety boundaries.</Text>
            <Text style={styles.heroMeta}>
              {activeChild.gradeLabel} | {activeChild.ageLabel}
            </Text>
          </View>

          <View style={styles.heroAvatarWrap}>
            <LinearGradient
              colors={[...Gradients.indigoDepth.colors]}
              end={Gradients.indigoDepth.end}
              start={Gradients.indigoDepth.start}
              style={styles.heroAvatarShell}
            >
              <Image contentFit="cover" source={activeChild.avatarSource} style={styles.heroAvatar} />
            </LinearGradient>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons accessibilityLabel="Star badge" color={Colors.white} name="star-four-points" size={14} />
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader iconName="clock-outline" title="Time Limits" />

          <View style={styles.surfaceCard}>
            <View style={styles.allowanceRow}>
              <Text style={styles.overline}>Daily Allowance</Text>
              <Text style={styles.allowanceValue}>{minutesToLabel(dailyAllowanceMinutes)}</Text>
            </View>

            <SteppedSlider options={DAILY_ALLOWANCE_OPTIONS} onChange={setDailyAllowanceMinutes} value={dailyAllowanceMinutes} />

            <Text style={styles.overline}>Active Window</Text>
            <View style={styles.windowTrack}>
              <View style={styles.windowTrackBase} />
              <View
                style={[
                  styles.windowHighlight,
                  {
                    left: `${windowStart * 100}%`,
                    width: `${Math.max((windowEnd - windowStart) * 100, 12)}%`,
                  },
                ]}
              />
              <Text style={styles.windowLabel}>
                {activeChild.activeWindowStart} - {activeChild.activeWindowEnd}
              </Text>
            </View>
            <View style={styles.windowTicks}>
              <Text style={styles.windowTickLabel}>12AM</Text>
              <Text style={styles.windowTickLabel}>6AM</Text>
              <Text style={styles.windowTickLabel}>12PM</Text>
              <Text style={styles.windowTickLabel}>6PM</Text>
              <Text style={styles.windowTickLabel}>12AM</Text>
            </View>

            <View style={styles.pauseRow}>
              <View style={styles.pauseCopy}>
                <View style={styles.pauseHeader}>
                  <MaterialCommunityIcons accessibilityLabel="Pause access" color={Colors.primary} name="pause-circle-outline" size={18} />
                  <Text style={styles.pauseTitle}>Pause access</Text>
                </View>
                <Text style={styles.pauseBody}>
                  Lock {firstName(activeChild.name)}
                  {"'s"} device immediately
                </Text>
              </View>
              <Switch
                accessibilityLabel={`Pause access for ${firstName(activeChild.name)}`}
                accessibilityRole="switch"
                onValueChange={setPauseAccessEnabled}
                thumbColor={Colors.white}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                value={pauseAccessEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader iconName="school-outline" title="Learning & Content" />

          <View style={[styles.splitRow, !isWideLayout ? styles.splitRowStacked : null]}>
            <View style={[styles.surfaceCard, styles.flexCard]}>
              <Text style={styles.overline}>Curriculum</Text>
              <View style={styles.curriculumList}>
                {curriculum.map((subject) => (
                  <View key={subject.id} style={styles.curriculumRow}>
                    <Text style={styles.curriculumLabel}>{subject.label}</Text>
                    <Switch
                      accessibilityLabel={`${subject.label} subject toggle`}
                      accessibilityRole="switch"
                      onValueChange={() => toggleSubject(subject.id)}
                      thumbColor={Colors.white}
                      trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                      value={subject.enabled}
                    />
                  </View>
                ))}
              </View>
            </View>

            <LinearGradient
              colors={[...Gradients.indigoDepth.colors]}
              end={Gradients.indigoDepth.end}
              start={Gradients.indigoDepth.start}
              style={[styles.homeworkCard, styles.flexCard]}
            >
              <View style={styles.homeworkHeader}>
                <Text style={styles.homeworkTitle}>Homework mode</Text>
                <MaterialCommunityIcons accessibilityLabel="Homework mode" color={Colors.white} name="lightning-bolt-outline" size={22} />
              </View>
              <Text style={styles.homeworkBody}>
                Prioritize educational activities over games.
              </Text>
              <Switch
                accessibilityLabel="Homework mode"
                accessibilityRole="switch"
                onValueChange={setHomeworkModeEnabled}
                thumbColor={Colors.primary}
                trackColor={{ false: Colors.primaryFixed, true: Colors.white }}
                value={homeworkModeEnabled}
              />
            </LinearGradient>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Safety level for ${firstName(activeChild.name)}`}
            style={({ pressed }) => [styles.surfaceCard, pressed ? styles.surfacePressed : null]}
          >
            <View style={styles.inlineRow}>
              <View style={styles.inlineCopy}>
                <View style={styles.inlineTitleRow}>
                  <MaterialCommunityIcons accessibilityLabel="Safety level" color={Colors.primary} name="shield-check-outline" size={18} />
                  <Text style={styles.inlineTitle}>Safety level</Text>
                </View>
                <Text style={styles.inlineBody}>{activeChild.safetySubtitle}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{activeChild.safetyLevelLabel}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader iconName="microphone-outline" title="Voice & Assistant" />
          <LabeledToggleRow
            accessibilityLabel="Mic access"
            description="Allow spoken questions and voice replies during learning sessions."
            label="Mic access"
            onValueChange={setMicAccessEnabled}
            value={micAccessEnabled}
          />
          <LabeledToggleRow
            accessibilityLabel="Audio storage"
            description="Store voice clips for quality review and support follow-up."
            label="Audio storage"
            onValueChange={setAudioStorageEnabled}
            value={audioStorageEnabled}
          />
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader iconName="bell-outline" title="Alerts" />

          <View style={[styles.splitRow, !isWideLayout ? styles.splitRowStacked : null]}>
            {alertPreferences.map((alert) => (
              <Pressable
                key={alert.id}
                accessibilityRole="switch"
                accessibilityLabel={alert.title}
                accessibilityState={{ checked: alert.enabled }}
                onPress={() => toggleAlert(alert.id)}
                style={({ pressed }) => [
                  styles.alertCard,
                  alert.enabled ? styles.alertCardEnabled : null,
                  pressed ? styles.surfacePressed : null,
                ]}
              >
                <MaterialCommunityIcons accessibilityLabel={alert.title} color={alert.enabled ? Colors.primary : Colors.textSecondary} name={alert.iconName} size={22} />
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertBody}>{alert.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader iconName="lock-outline" title="Data & Privacy" />

          <View style={styles.surfaceCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete history"
              style={({ pressed }) => [styles.linkRow, pressed ? styles.surfacePressed : null]}
            >
              <View style={styles.inlineTitleRow}>
                <MaterialCommunityIcons accessibilityLabel="Delete history" color={Colors.text} name="history" size={18} />
                <Text style={styles.inlineTitle}>Delete history</Text>
              </View>
              <MaterialCommunityIcons accessibilityLabel="Go to delete history" color={Colors.textSecondary} name="chevron-right" size={20} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export data"
              style={({ pressed }) => [styles.linkRow, pressed ? styles.surfacePressed : null]}
            >
              <View style={styles.inlineTitleRow}>
                <MaterialCommunityIcons accessibilityLabel="Export data" color={Colors.text} name="export-variant" size={18} />
                <Text style={styles.inlineTitle}>Export data</Text>
              </View>
              <MaterialCommunityIcons accessibilityLabel="Go to export data" color={Colors.textSecondary} name="chevron-right" size={20} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete profile"
              style={({ pressed }) => [styles.linkRow, pressed ? styles.surfacePressed : null]}
            >
              <View style={styles.inlineTitleRow}>
                <MaterialCommunityIcons accessibilityLabel="Delete profile" color={Colors.errorText} name="trash-can-outline" size={18} />
                <Text style={styles.destructiveLabel}>Delete profile</Text>
              </View>
              <MaterialCommunityIcons accessibilityLabel="Go to delete profile" color={Colors.errorText} name="chevron-right" size={20} />
            </Pressable>
          </View>

          <View style={styles.auditCard}>
            <View style={styles.auditBadge}>
              <Text style={styles.auditBadgeLabel}>Audit Logged: {activeChild.auditLoggedAt}</Text>
            </View>
            <Text style={styles.auditBody}>
              All changes to Parental Controls are logged for your review in the Security Hub.
            </Text>
          </View>
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
    gap: Spacing.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
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
  heroMeta: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  heroAvatarWrap: {
    position: 'relative',
  },
  heroAvatarShell: {
    width: 92,
    height: 92,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Colors.accentPurple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  sectionBlock: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionHeaderLabel: {
    ...Typography.bodySemiBold,
    color: Colors.text,
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
  surfacePressed: {
    transform: [{ scale: 0.99 }],
  },
  allowanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  overline: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  allowanceValue: {
    ...Typography.title,
    color: Colors.primary,
  },
  sliderContainer: {
    height: 34,
    justifyContent: 'center',
  },
  sliderTrackBase: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLowest,
    transform: [{ translateX: -11 }],
    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  sliderTapTargets: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderTapTarget: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTapTargetPressed: {
    transform: [{ scale: 0.95 }],
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  sliderDotActive: {
    backgroundColor: Colors.primaryFixed,
  },
  windowTrack: {
    height: 44,
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  windowTrackBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  windowHighlight: {
    position: 'absolute',
    top: 18,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  windowLabel: {
    ...Typography.captionMedium,
    color: Colors.text,
    textAlign: 'center',
  },
  windowTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  windowTickLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  pauseCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  pauseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pauseTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  pauseBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  splitRowStacked: {
    flexDirection: 'column',
  },
  flexCard: {
    flex: 1,
  },
  curriculumList: {
    gap: Spacing.sm,
  },
  curriculumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  curriculumLabel: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  homeworkCard: {
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    justifyContent: 'space-between',
    minHeight: 196,
  },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  homeworkTitle: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  homeworkBody: {
    ...Typography.body,
    color: Colors.primaryFixed,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  inlineCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  inlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  inlineTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  inlineBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chip: {
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chipLabel: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  alertCard: {
    flex: 1,
    minHeight: 148,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  alertCardEnabled: {
    borderColor: Colors.primaryFixed,
    backgroundColor: Colors.surfaceContainerLow,
  },
  alertTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  alertBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  destructiveLabel: {
    ...Typography.bodySemiBold,
    color: Colors.errorText,
  },
  auditCard: {
    gap: Spacing.sm,
  },
  auditBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  auditBadgeLabel: {
    ...Typography.label,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  auditBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
    height: 180,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
