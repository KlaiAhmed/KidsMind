import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppRefreshControl } from '@/src/components/AppRefreshControl';
import {
  ParentDashboardEmptyState,
  ParentDashboardErrorState,
  SkeletonBlock,
} from '@/src/components/parent/ParentDashboardStates';
import { AvatarPlaceholder } from '@/components/ui/AvatarPlaceholder';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateConversationSummary,
  getConversationHistory,
  type ParentConversationMessage,
} from '@/services/parentDashboardService';
import { useParentDashboardChild } from '@/src/hooks/useParentDashboardChild';

interface ParsedAiContent {
  text: string;
  example: string | null;
}

interface SummaryState {
  isLoading: boolean;
  text: string | null;
}

function getParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstSentence(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match?.[1] ?? normalized;
  const trimmed = sentence.length > 150 ? `${sentence.slice(0, 147).trim()}...` : sentence;

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function buildLocalSummary(messages: ParentConversationMessage[], childName: string): string {
  const firstChildMessage = messages.find((message) => message.sender === 'child' && message.rawContent.trim());
  if (!firstChildMessage) {
    return 'No child message was recorded in this session.';
  }

  return `${childName} asked: ${firstSentence(firstChildMessage.rawContent)}`;
}

function parseAiContent(content: string): ParsedAiContent {
  try {
    const parsed = JSON.parse(content);
    if (isRecord(parsed)) {
      return {
        text: normalizeOptionalString(parsed.explanation) ?? content,
        example: normalizeOptionalString(parsed.example),
      };
    }
  } catch {
    return {
      text: content,
      example: null,
    };
  }

  return {
    text: content,
    example: null,
  };
}

function formatTimeLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Session';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Session';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

function formatHeaderTitle(session: { startedAt: string | null; lastMessageAt: string | null; messageCount: number } | null): string {
  if (!session) {
    return 'Conversation';
  }

  const countLabel = session.messageCount === 1 ? '1 message' : `${session.messageCount} messages`;
  return `${formatDateLabel(session.startedAt ?? session.lastMessageAt)} \u00B7 ${countLabel}`;
}

function SessionSkeleton() {
  return (
    <View style={styles.skeletonList}>
      <SkeletonBlock style={styles.skeletonAiBubble} />
      <SkeletonBlock style={styles.skeletonChildBubble} />
      <SkeletonBlock style={styles.skeletonAiBubble} />
      <SkeletonBlock style={styles.skeletonChildBubble} />
    </View>
  );
}

function SummaryBanner({ isLoading, text }: SummaryState) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconShell}>
        <MaterialCommunityIcons color={Colors.accentAmber} name="lightbulb-on-outline" size={20} />
      </View>
      <View style={styles.summaryCopy}>
        {isLoading ? (
          <>
            <SkeletonBlock style={styles.summarySkeletonWide} />
            <SkeletonBlock style={styles.summarySkeletonShort} />
          </>
        ) : (
          <Text style={styles.summaryText}>{text ?? 'No summary available for this session.'}</Text>
        )}
      </View>
    </View>
  );
}

interface SessionMessageRowProps {
  childName: string;
  item: ParentConversationMessage;
  renderChildAvatar: () => ReactNode;
}

function SessionMessageRow({ childName, item, renderChildAvatar }: SessionMessageRowProps) {
  const isAiMessage = item.sender === 'ai';
  const parsedAiContent = isAiMessage ? parseAiContent(item.rawContent) : null;
  const displayText = isAiMessage ? parsedAiContent?.text ?? item.rawContent : item.rawContent;
  const timeLabel = formatTimeLabel(item.createdAt);
  const hasSafetyFlags = item.safetyFlags.length > 0;

  return (
    <View style={styles.messageOuter}>
      <View style={[styles.messageRow, isAiMessage ? styles.aiRow : styles.childRow]}>
        {isAiMessage ? (
          <View style={styles.aiAvatarBadge}>
            <MaterialCommunityIcons name="robot-happy-outline" size={18} color={Colors.primary} />
          </View>
        ) : null}

        {!isAiMessage && hasSafetyFlags ? (
          <MaterialCommunityIcons name="flag" size={16} color={Colors.error} style={styles.childFlagIcon} />
        ) : null}

        <View style={[styles.messageColumn, isAiMessage ? styles.aiColumn : styles.childColumn]}>
          <Text style={[styles.senderLabel, isAiMessage ? styles.aiSenderLabel : styles.childSenderLabel]}>
            {isAiMessage ? 'Qubie' : childName}
          </Text>
          <View
            style={[
              styles.bubble,
              isAiMessage ? styles.aiBubble : styles.childBubble,
              hasSafetyFlags ? styles.flaggedBubble : null,
            ]}
          >
            <Text style={[styles.messageText, isAiMessage ? styles.aiText : styles.childText]}>
              {displayText}
            </Text>
            {isAiMessage && parsedAiContent?.example ? (
              <Text style={styles.exampleText}>{parsedAiContent.example}</Text>
            ) : null}
            {timeLabel ? (
              <Text style={[styles.timeText, isAiMessage ? styles.aiTimeText : styles.childTimeText]}>
                {timeLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {isAiMessage && hasSafetyFlags ? (
          <MaterialCommunityIcons name="flag" size={16} color={Colors.error} style={styles.aiFlagIcon} />
        ) : null}

        {!isAiMessage ? renderChildAvatar() : null}
      </View>
    </View>
  );
}

export default function SessionDrillDownScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
  }>();
  const sessionId = getParamValue(params.sessionId);
  const { user, childDataLoading, childProfileStatus } = useAuth();
  const { children, activeChild, getChildAvatarSource } = useParentDashboardChild();
  const [summary, setSummary] = useState<SummaryState>({
    isLoading: true,
    text: null,
  });
  const [childAvatarError, setChildAvatarError] = useState(false);

  const isChildDataResolving = childProfileStatus === 'unknown' || (childDataLoading && children.length === 0);

  const sessionQuery = useQuery({
    queryKey: ['parent-dashboard', 'session-drill-down', user?.id, activeChild?.id, sessionId],
    queryFn: async () =>
      getConversationHistory({
        userId: user!.id,
        childId: activeChild!.id,
        sessionId: sessionId!,
        limit: 500,
      }),
    enabled: Boolean(user?.id && activeChild?.id && sessionId),
    staleTime: 60 * 1000,
  });

  const session = useMemo(() => {
    const sessions = sessionQuery.data?.sessions ?? [];
    return sessions.find((entry) => entry.id === sessionId) ?? null;
  }, [sessionQuery.data?.sessions, sessionId]);

  const messages = useMemo(() => session?.messages ?? [], [session?.messages]);
  const childName = activeChild?.nickname ?? activeChild?.name ?? 'Child';
  const childAvatarSource = activeChild ? getChildAvatarSource(activeChild) : null;
  const messageSignature = useMemo(
    () => messages.map((message) => `${message.id}:${message.rawContent}:${message.createdAt ?? ''}`).join('|'),
    [messages],
  );

  useEffect(() => {
    let isCancelled = false;

    if (!session || messages.length === 0) {
      setSummary({
        isLoading: false,
        text: session ? 'No messages were recorded in this session.' : null,
      });
      return () => {
        isCancelled = true;
      };
    }

    setSummary({
      isLoading: true,
      text: null,
    });

    async function loadSummary() {
      try {
        const aiSummary = await generateConversationSummary(messages);
        if (!isCancelled) {
          setSummary({
            isLoading: false,
            text: aiSummary ? firstSentence(aiSummary) : buildLocalSummary(messages, childName),
          });
        }
      } catch {
        if (!isCancelled) {
          setSummary({
            isLoading: false,
            text: buildLocalSummary(messages, childName),
          });
        }
      }
    }

    void loadSummary();

    return () => {
      isCancelled = true;
    };
  }, [childName, messageSignature, messages, session]);

  const handleRefresh = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  const renderChildAvatar = useCallback(() => {
    if (childAvatarError || !activeChild?.avatarId || !childAvatarSource) {
      return <AvatarPlaceholder size={28} style={styles.childAvatarPlaceholder} />;
    }

    return (
      <Image
        contentFit="cover"
        source={childAvatarSource}
        style={styles.childAvatar}
        onError={() => setChildAvatarError(true)}
      />
    );
  }, [activeChild, childAvatarSource, childAvatarError]);

  const renderMessage = useCallback(
    ({ item }: { item: ParentConversationMessage }) => (
      <SessionMessageRow
        childName={childName}
        item={item}
        renderChildAvatar={renderChildAvatar}
      />
    ),
    [childName, renderChildAvatar],
  );

  const headerTitle = formatHeaderTitle(session);
  const isLoading = isChildDataResolving || sessionQuery.isPending;

  function renderContent() {
    if (!sessionId) {
      return (
        <ParentDashboardErrorState
          message="This session link is missing a session id."
          onRetry={() => router.back()}
          title="Session unavailable"
        />
      );
    }

    if (!children.length && !isChildDataResolving) {
      return (
        <ParentDashboardEmptyState
          iconName="account-child-circle"
          subtitle="Add a child profile before reviewing conversation history."
          title="No child profile found."
        />
      );
    }

    if (!activeChild && !isChildDataResolving) {
      return (
        <ParentDashboardErrorState
          message="Try returning to history and choosing the child profile again."
          onRetry={() => router.back()}
          title="We couldn't load this child"
        />
      );
    }

    if (isLoading) {
      return <SessionSkeleton />;
    }

    if (sessionQuery.isError) {
      return (
        <ParentDashboardErrorState
          error={sessionQuery.error}
          onRetry={() => {
            void sessionQuery.refetch();
          }}
          title="Conversation unavailable"
        />
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyListWrap}>
            <ParentDashboardEmptyState
              compact
              iconName="message-processing-outline"
              subtitle="There are no saved messages in this session."
              title="No messages yet."
            />
          </View>
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={handleRefresh}
            refreshing={sessionQuery.isRefetching}
          />
        }
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons color={Colors.text} name="chevron-left" size={26} />
        </Pressable>
        <Text numberOfLines={2} style={styles.headerTitle}>
          {headerTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryWrap}>
        <SummaryBanner isLoading={summary.isLoading || isLoading} text={summary.text} />
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerTitle: {
    ...Typography.title,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  summaryWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  summaryCard: {
    minHeight: 72,
    borderRadius: Radii.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentAmber,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  summaryIconShell: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  summarySkeletonWide: {
    height: 16,
    width: '96%',
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  summarySkeletonShort: {
    height: 16,
    width: '62%',
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  messageOuter: {
    marginBottom: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  aiRow: {
    justifyContent: 'flex-start',
    paddingRight: Spacing.xl,
  },
  childRow: {
    justifyContent: 'flex-end',
    paddingLeft: Spacing.xl,
  },
  messageColumn: {
    maxWidth: '82%',
    gap: Spacing.xs,
  },
  aiColumn: {
    alignItems: 'flex-start',
  },
  childColumn: {
    alignItems: 'flex-end',
  },
  senderLabel: {
    ...Typography.label,
    textTransform: 'none',
    letterSpacing: 0,
  },
  aiSenderLabel: {
    color: Colors.textSecondary,
  },
  childSenderLabel: {
    color: Colors.primary,
    textAlign: 'right',
  },
  aiAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
    marginTop: Spacing.lg,
  },
  childAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
    marginTop: Spacing.lg,
  },
  childAvatarPlaceholder: {
    marginTop: Spacing.lg,
  },
  bubble: {
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  aiBubble: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radii.sm,
  },
  childBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: Radii.sm,
  },
  flaggedBubble: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  messageText: {
    ...Typography.body,
  },
  aiText: {
    color: Colors.text,
  },
  childText: {
    color: Colors.white,
  },
  exampleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  timeText: {
    ...Typography.caption,
    alignSelf: 'flex-end',
  },
  aiTimeText: {
    color: Colors.textTertiary,
  },
  childTimeText: {
    color: Colors.primaryFixed,
  },
  aiFlagIcon: {
    marginTop: Spacing.xl,
  },
  childFlagIcon: {
    marginTop: Spacing.xl,
  },
  skeletonList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  skeletonAiBubble: {
    width: '72%',
    height: 74,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  skeletonChildBubble: {
    width: '66%',
    height: 64,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    alignSelf: 'flex-end',
  },
  emptyListWrap: {
    paddingTop: Spacing.xl,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
