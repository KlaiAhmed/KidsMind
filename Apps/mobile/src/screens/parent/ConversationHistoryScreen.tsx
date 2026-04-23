import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { SafetyFlagAnnotation } from '@/src/components/parent/SafetyFlagAnnotation';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import type { ChildProfile } from '@/types/child';

type HistoryScreenState = 'loading' | 'ready' | 'error' | 'empty';

type SubjectFilter = 'all' | 'Astronomy' | 'Mathematics' | 'Science';

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'child';
  body: string;
  safetyFlagDescription?: string;
}

interface ConversationItem {
  id: string;
  subject: SubjectFilter;
  iconName: 'rocket-launch-outline' | 'sigma' | 'book-open-page-variant-outline';
  title: string;
  timestampLabel: string;
  messageCountLabel: string;
  messages?: ConversationMessage[];
}

interface ConversationDayGroup {
  label: string;
  layout: 'thread' | 'cards';
  conversations: ConversationItem[];
}

interface HistoryChildData {
  id: string;
  name: string;
  avatarSource: ImageSourcePropType;
  groups: ConversationDayGroup[];
}

export interface ConversationHistoryScreenProps {
  initialState?: HistoryScreenState;
  errorMessage?: string;
}

const SUBJECT_CHIPS: SubjectFilter[] = ['Astronomy', 'Mathematics', 'Science'];

const SECONDARY_CHILDREN = [
  { id: 'child-maya', name: 'Maya', avatarId: 'avatar-2' },
  { id: 'child-sarah', name: 'Sarah', avatarId: 'avatar-4' },
] as const;

function buildConversationGroups(childName: string): ConversationDayGroup[] {
  return [
    {
      label: 'Today',
      layout: 'thread',
      conversations: [
        {
          id: 'astronomy-safety',
          subject: 'Astronomy',
          iconName: 'rocket-launch-outline',
          title: 'Why astronauts float in space',
          timestampLabel: '4:10 PM',
          messageCountLabel: '12 messages',
          messages: [
            {
              id: 'msg-1',
              sender: 'child',
              body: 'If I jump from the roof, will I float like astronauts do?',
            },
            {
              id: 'msg-2',
              sender: 'ai',
              body: 'Astronauts float because they are falling around Earth inside a spacecraft. Roofs are not safe places to test that idea.',
              safetyFlagDescription:
                'Physical safety curiosity detected. AI guided conversation toward safe conceptual boundaries.',
            },
            {
              id: 'msg-3',
              sender: 'child',
              body: 'Can we try it with a toy rocket instead?',
            },
            {
              id: 'msg-4',
              sender: 'ai',
              body: 'Yes. We can model it with a paper rocket and talk about gravity safely.',
            },
          ],
        },
        {
          id: 'math-review',
          subject: 'Mathematics',
          iconName: 'sigma',
          title: 'Patterns in multiplication tables',
          timestampLabel: '1:45 PM',
          messageCountLabel: '9 messages',
          messages: [
            {
              id: 'msg-5',
              sender: 'child',
              body: 'Why does 9 make the digits add to 9 so often?',
            },
            {
              id: 'msg-6',
              sender: 'ai',
              body: 'That happens because of how place value works in base ten. Let us look at a few examples together.',
            },
          ],
        },
      ],
    },
    {
      label: 'Yesterday',
      layout: 'cards',
      conversations: [
        {
          id: 'fraction-pizza',
          subject: 'Mathematics',
          iconName: 'sigma',
          title: 'Fractions with pizza slices',
          timestampLabel: '6:25 PM',
          messageCountLabel: '7 messages',
        },
        {
          id: 'ocean-layers',
          subject: 'Science',
          iconName: 'book-open-page-variant-outline',
          title: `${childName} explored ocean layers`,
          timestampLabel: '3:05 PM',
          messageCountLabel: '11 messages',
        },
      ],
    },
  ];
}

function buildHistoryChildren(params: {
  childProfile: ChildProfile | null;
  getAvatarSource: (avatarId: string) => ImageSourcePropType;
}): HistoryChildData[] {
  const activeChildName = params.childProfile?.nickname ?? params.childProfile?.name ?? 'Leo';

  const primaryChild: HistoryChildData = {
    id: params.childProfile?.id ?? 'child-leo',
    name: activeChildName,
    avatarSource: params.getAvatarSource(params.childProfile?.avatarId ?? 'avatar-1'),
    groups: buildConversationGroups(activeChildName),
  };

  return [
    primaryChild,
    ...SECONDARY_CHILDREN.map((child) => ({
      id: child.id,
      name: child.name,
      avatarSource: params.getAvatarSource(child.avatarId),
      groups: buildConversationGroups(child.name),
    })),
  ];
}

export default function ConversationHistoryScreen({
  initialState,
  errorMessage = 'Conversation history could not be loaded.',
}: ConversationHistoryScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    childId?: string;
    flaggedOnly?: string;
    topic?: string;
  }>();
  const { childProfile } = useAuth();
  const { getAvatarById } = useChildProfile();
  const focusTopic = typeof params.topic === 'string' ? params.topic : undefined;

  const [viewState, setViewState] = useState<HistoryScreenState>(
    initialState ?? (childProfile ? 'ready' : 'empty')
  );
  const [searchValue, setSearchValue] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>(focusTopic ? 'all' : 'Astronomy');
  const [dateRangeLabel, setDateRangeLabel] = useState<'Last 7 Days' | 'Last 30 Days'>('Last 7 Days');
  const [flaggedOnly, setFlaggedOnly] = useState(params.flaggedOnly === 'true');
  const [expandedIds, setExpandedIds] = useState<string[]>(['astronomy-safety']);

  const children = useMemo(
    () =>
      buildHistoryChildren({
        childProfile,
        getAvatarSource: (avatarId) => getAvatarById(avatarId).asset,
      }),
    [childProfile, getAvatarById]
  );

  const activeChild =
    children.find((child) => child.id === params.childId) ??
    children[0];

  const filteredGroups = useMemo(() => {
    if (!activeChild) {
      return [];
    }

    const normalizedQuery = searchValue.trim().toLowerCase();

    return activeChild.groups
      .map((group) => {
        const conversations = group.conversations.filter((conversation) => {
          const matchesSubject = subjectFilter === 'all' || conversation.subject === subjectFilter;
          const hasFlag = conversation.messages?.some((message) => Boolean(message.safetyFlagDescription)) ?? false;
          const matchesFlagged = !flaggedOnly || hasFlag;
          const matchesTopic = !focusTopic || conversation.title.toLowerCase().includes(focusTopic.toLowerCase());
          const messageText = conversation.messages?.map((message) => message.body).join(' ').toLowerCase() ?? '';
          const matchesSearch =
            normalizedQuery.length === 0 ||
            conversation.title.toLowerCase().includes(normalizedQuery) ||
            conversation.subject.toLowerCase().includes(normalizedQuery) ||
            messageText.includes(normalizedQuery);

          return matchesSubject && matchesFlagged && matchesSearch && matchesTopic;
        });

        return {
          ...group,
          conversations,
        };
      })
      .filter((group) => group.conversations.length > 0);
  }, [activeChild, flaggedOnly, focusTopic, searchValue, subjectFilter]);

  function toggleExpanded(conversationId: string) {
    setExpandedIds((current) =>
      current.includes(conversationId)
        ? current.filter((entry) => entry !== conversationId)
        : [...current, conversationId]
    );
  }

  if (viewState === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            accessibilityLabel="Conversation history unavailable"
            color={Colors.errorText}
            name="alert-circle-outline"
            size={34}
          />
          <Text style={styles.feedbackTitle}>Conversation history paused</Text>
          <Text style={styles.feedbackBody}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading history"
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
            accessibilityLabel="No conversations yet"
            color={Colors.primary}
            name="message-processing-outline"
            size={40}
          />
          <Text style={styles.feedbackTitle}>No conversations yet</Text>
          <Text style={styles.feedbackBody}>
            Once a child starts chatting with the tutor, conversation history will appear here.
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

        <View style={styles.heroWrap}>
          <View style={styles.heroCopy}>
            <Text style={styles.screenTitle}>Conversation History: {activeChild.name}</Text>
            {focusTopic ? (
              <Text style={styles.focusTopic}>Focused topic: {focusTopic}</Text>
            ) : null}
          </View>
          <Image contentFit="cover" source={activeChild.avatarSource} style={styles.childAvatar} />
        </View>

        <View style={styles.searchShell}>
          <MaterialCommunityIcons accessibilityLabel="Search conversations" color={Colors.placeholder} name="magnify" size={20} />
          <TextInput
            accessibilityLabel="Search conversations"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchValue}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.placeholder}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchValue}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change date range"
            onPress={() =>
              setDateRangeLabel((current) => (current === 'Last 7 Days' ? 'Last 30 Days' : 'Last 7 Days'))
            }
            style={({ pressed }) => [styles.filterButton, pressed ? styles.filterButtonPressed : null]}
          >
            <MaterialCommunityIcons accessibilityLabel="Filter" color={Colors.primary} name="tune-variant" size={18} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.filtersRow}
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change date range"
            onPress={() =>
              setDateRangeLabel((current) => (current === 'Last 7 Days' ? 'Last 30 Days' : 'Last 7 Days'))
            }
            style={({ pressed }) => [styles.dateChip, pressed ? styles.dateChipPressed : null]}
          >
            <Text style={styles.dateChipLabel}>{dateRangeLabel}</Text>
            <MaterialCommunityIcons accessibilityLabel="Date range" color={Colors.primary} name="chevron-down" size={18} />
          </Pressable>

          {SUBJECT_CHIPS.map((subject) => {
            const selected = subjectFilter === subject;
            const isAstronomy = subject === 'Astronomy';

            return (
              <Pressable
                key={subject}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${subject}`}
                accessibilityState={{ selected }}
                onPress={() => setSubjectFilter(selected ? 'all' : subject)}
                style={({ pressed }) => [
                  styles.subjectChip,
                  selected
                    ? isAstronomy
                      ? styles.subjectChipAstronomy
                      : styles.subjectChipSelected
                    : null,
                  pressed ? styles.subjectChipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipLabel,
                    selected ? styles.subjectChipLabelSelected : null,
                  ]}
                >
                  {subject}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Flagged conversations only"
            accessibilityState={{ checked: flaggedOnly }}
            onPress={() => setFlaggedOnly((current) => !current)}
            style={({ pressed }) => [
              styles.flaggedToggle,
              flaggedOnly ? styles.flaggedToggleActive : null,
              pressed ? styles.flaggedTogglePressed : null,
            ]}
          >
            <Text style={[styles.flaggedToggleLabel, flaggedOnly ? styles.flaggedToggleLabelActive : null]}>
              Flagged only
            </Text>
            <View style={[styles.flagDot, flaggedOnly ? styles.flagDotActive : null]} />
          </Pressable>
        </ScrollView>

        {filteredGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons accessibilityLabel="No matching history" color={Colors.textSecondary} name="magnify-close" size={32} />
            <Text style={styles.emptyTitle}>No matching conversations</Text>
            <Text style={styles.emptyBody}>
              Try another search, switch subjects, or clear the flagged-only filter.
            </Text>
          </View>
        ) : (
          filteredGroups.map((group) => (
            <View key={group.label} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group.label}</Text>

              {group.layout === 'thread' ? (
                <View style={styles.threadList}>
                  {group.conversations.map((conversation) => {
                    const expanded = expandedIds.includes(conversation.id);

                    return (
                      <View key={conversation.id} style={styles.threadCard}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${conversation.title}`}
                          onPress={() => toggleExpanded(conversation.id)}
                          style={({ pressed }) => [
                            styles.threadHeader,
                            pressed ? styles.threadHeaderPressed : null,
                          ]}
                        >
                          <View style={styles.threadHeaderLeft}>
                            <View style={styles.threadIconWrap}>
                              <MaterialCommunityIcons accessibilityLabel={conversation.subject} color={Colors.primary} name={conversation.iconName} size={18} />
                            </View>
                            <View style={styles.threadCopy}>
                              <Text style={styles.threadTitle}>{conversation.title}</Text>
                              <Text style={styles.threadMeta}>
                                {conversation.timestampLabel} | {conversation.messageCountLabel}
                              </Text>
                            </View>
                          </View>
                          <MaterialCommunityIcons accessibilityLabel={expanded ? 'Collapse conversation' : 'Expand conversation'} color={Colors.textSecondary} name={expanded ? 'chevron-up' : 'chevron-down'} size={22} />
                        </Pressable>

                        {expanded && conversation.messages ? (
                          <View style={styles.messagesColumn}>
                            {conversation.messages.map((message) => (
                              <View key={message.id} style={message.sender === 'child' ? styles.childMessageGroup : styles.aiMessageGroup}>
                                {message.safetyFlagDescription ? (
                                  <SafetyFlagAnnotation description={message.safetyFlagDescription} />
                                ) : null}
                                <View
                                  style={[
                                    styles.messageBubble,
                                    message.sender === 'child' ? styles.childBubble : styles.aiBubble,
                                  ]}
                                >
                                  <Text style={styles.messageText}>{message.body}</Text>
                                </View>
                                {message.sender === 'child' ? (
                                  <Image contentFit="cover" source={activeChild.avatarSource} style={styles.messageAvatar} />
                                ) : null}
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.yesterdayGrid}>
                  {group.conversations.map((conversation) => (
                    <Pressable
                      key={conversation.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${conversation.title}`}
                      onPress={() => toggleExpanded(conversation.id)}
                      style={({ pressed }) => [
                        styles.compactCard,
                        pressed ? styles.compactCardPressed : null,
                      ]}
                    >
                      <View style={styles.compactIconWrap}>
                        <MaterialCommunityIcons accessibilityLabel={conversation.subject} color={Colors.primary} name={conversation.iconName} size={18} />
                      </View>
                      <Text style={styles.compactTitle}>{conversation.title}</Text>
                      <Text style={styles.compactMeta}>
                        {conversation.timestampLabel} | {conversation.messageCountLabel}
                      </Text>
                      <MaterialCommunityIcons accessibilityLabel="Open conversation" color={Colors.primary} name="arrow-right" size={18} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <MaterialCommunityIcons accessibilityLabel="Privacy shield" color={Colors.primary} name="shield-lock-outline" size={20} />
            <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
          </View>
          <Text style={styles.privacyBody}>
            Conversations stay encrypted for 30 days so you can review learning moments, resolve flags, and then let older threads expire automatically.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open privacy settings"
            onPress={() => router.push(`/(tabs)/profile?childId=${encodeURIComponent(activeChild.id)}` as never)}
          >
            <Text style={styles.privacyLink}>Privacy Settings {'->'}</Text>
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
  heroWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  focusTopic: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  childAvatar: {
    width: 58,
    height: 58,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  searchShell: {
    minHeight: 56,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  filterButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  filtersRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  dateChip: {
    minHeight: 42,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  dateChipLabel: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  subjectChip: {
    minHeight: 42,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  subjectChipAstronomy: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryContainer,
  },
  subjectChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  subjectChipLabel: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  subjectChipLabelSelected: {
    color: Colors.white,
  },
  flaggedToggle: {
    minHeight: 42,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flaggedToggleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  flaggedTogglePressed: {
    transform: [{ scale: 0.98 }],
  },
  flaggedToggleLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  flaggedToggleLabelActive: {
    color: Colors.primary,
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  flagDotActive: {
    backgroundColor: Colors.primary,
  },
  groupBlock: {
    gap: Spacing.sm,
  },
  groupLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  threadList: {
    gap: Spacing.sm,
  },
  threadCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
    ...Shadows.card,
  },
  threadHeader: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  threadHeaderPressed: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  threadHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  threadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadCopy: {
    flex: 1,
    gap: 2,
  },
  threadTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  threadMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  messagesColumn: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aiMessageGroup: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  childMessageGroup: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  aiBubble: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  childBubble: {
    backgroundColor: Colors.primaryFixed,
  },
  messageText: {
    ...Typography.body,
    color: Colors.text,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
  },
  yesterdayGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  compactCard: {
    flex: 1,
    minHeight: 156,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  compactCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  compactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  compactMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  privacyCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  privacyTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  privacyBody: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  privacyLink: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  emptyCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  emptyBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    height: 176,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
