// Apps/mobile/screens/AIChatScreen.tsx
import { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SessionHeader } from '@/components/chat/SessionHeader';
import { SessionGateOverlay } from '@/components/session/SessionGateOverlay';
import { useChatSession } from '@/hooks/useChatSession';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useChildSessionGate } from '@/hooks/useChildSessionGate';
import { useSubjects } from '@/hooks/useSubjects';
import { getChildTabSceneBottomPadding } from '@/components/navigation/bottomNavTokens';
import type { ChildProfile } from '@/types/child';
import type { Message } from '@/types/chat';

interface ChatRouteParams {
  subjectId?: string;
  topicId?: string;
  subjectName?: string;
}

type ChatListItem =
  | {
      id: string;
      type: 'message';
      message: Message;
    }
  | {
      id: string;
      type: 'typing';
    };

const TYPING_PLACEHOLDER_ID = 'typing-placeholder';

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as ChatRouteParams;
  const { profile } = useChildProfile();
  const childTabSceneBottomPadding = getChildTabSceneBottomPadding(insets.bottom);
  const { isSessionActive, nextSessionTimeLabel } = useChildSessionGate(profile?.id ?? null, {
    weekSchedule: profile?.rules?.weekSchedule ?? null,
  });

  if (!isSessionActive) {
    return (
      <QubieGateOverlay
        bottomPadding={childTabSceneBottomPadding}
        nextSessionTimeLabel={nextSessionTimeLabel}
      />
    );
  }

  return (
    <AIChatSessionGate
      childTabSceneBottomPadding={childTabSceneBottomPadding}
      params={params}
      profile={profile}
    />
  );
}

interface QubieGateOverlayProps {
  bottomPadding: number;
  dailyLimitReached?: boolean;
  nextSessionTimeLabel: string | null;
}

function QubieGateOverlay({
  bottomPadding,
  dailyLimitReached,
  nextSessionTimeLabel,
}: QubieGateOverlayProps) {
  const subtitle = dailyLimitReached
    ? 'Your learning time for today is done! Great job! 🌟'
    : nextSessionTimeLabel
      ? `You can chat at ${nextSessionTimeLabel}. See you soon!`
      : 'You can chat when your learning time opens. See you soon!';

  return (
    <SessionGateOverlay
      illustration="🤖"
      title="Qubie is resting right now"
      subtitle={subtitle}
      bottomPadding={bottomPadding}
    />
  );
}

interface AIChatSessionGateProps {
  childTabSceneBottomPadding: number;
  params: ChatRouteParams;
  profile: ChildProfile | null;
}

function AIChatSessionGate({
  childTabSceneBottomPadding,
  params,
  profile,
}: AIChatSessionGateProps) {
  const navigation = useNavigation();
  const { getSubjectById } = useSubjects();

  const resolvedSubjectName =
    params.subjectName ??
    (params.subjectId ? getSubjectById(params.subjectId)?.title : undefined);

  const dailyLimitMinutes =
    typeof profile?.rules?.dailyLimitMinutes === 'number'
      ? profile.rules.dailyLimitMinutes
      : undefined;

  const {
    state,
    elapsedSeconds,
    minutesRemaining,
    sendMessage,
    sendQuizRequest,
    transcribeRecording,
    setInputText,
    endSession,
    clearError,
  } =
    useChatSession({
      childId: profile?.id ?? null,
      ageGroup: profile?.ageGroup ?? '7-11',
      gradeLevel: profile?.gradeLevel ?? 'Grade 4',
      subjectContext: {
        subjectId: params.subjectId,
        subjectName: resolvedSubjectName,
        topicId: params.topicId,
      },
      dailyLimitMinutes,
    });
  const sessionGate = useChildSessionGate(profile?.id ?? null, {
    weekSchedule: profile?.rules?.weekSchedule ?? null,
    minutesRemaining,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      void endSession();
    });

    return unsubscribe;
  }, [endSession, navigation]);

  useEffect(() => {
    return () => {
      void endSession();
    };
  }, [endSession]);

  useEffect(() => {
    if (!sessionGate.isSessionActive && !sessionGate.isLoading) {
      void endSession();
    }
  }, [endSession, sessionGate.isLoading, sessionGate.isSessionActive]);

  if (!sessionGate.isSessionActive) {
    return (
      <QubieGateOverlay
        bottomPadding={childTabSceneBottomPadding}
        dailyLimitReached={sessionGate.isDailyLimitReached}
        nextSessionTimeLabel={sessionGate.nextSessionTimeLabel}
      />
    );
  }

  return (
    <AIChatInteractiveContent
      chatSession={{
        state,
        elapsedSeconds,
        minutesRemaining,
        sendMessage,
        sendQuizRequest,
        transcribeRecording,
        setInputText,
        clearError,
      }}
      childTabSceneBottomPadding={childTabSceneBottomPadding}
      profile={profile}
      resolvedSubjectName={resolvedSubjectName}
    />
  );
}

type AIChatSessionController = Pick<
  ReturnType<typeof useChatSession>,
  | 'state'
  | 'elapsedSeconds'
  | 'minutesRemaining'
  | 'sendMessage'
  | 'sendQuizRequest'
  | 'transcribeRecording'
  | 'setInputText'
  | 'clearError'
>;

interface AIChatInteractiveContentProps {
  chatSession: AIChatSessionController;
  childTabSceneBottomPadding: number;
  profile: ChildProfile | null;
  resolvedSubjectName: string | undefined;
}

function AIChatInteractiveContent({
  chatSession,
  childTabSceneBottomPadding,
  profile,
  resolvedSubjectName,
}: AIChatInteractiveContentProps) {
  const {
    state,
    elapsedSeconds,
    minutesRemaining,
    sendMessage,
    sendQuizRequest,
    transcribeRecording,
    setInputText,
    clearError,
  } = chatSession;

  const listData = useMemo<ChatListItem[]>(() => {
    const messageItems = [...state.messages].reverse().map((message) => ({
      id: message.id,
      type: 'message' as const,
      message,
    }));

    if (state.isAwaitingResponse) {
      return [
        {
          id: TYPING_PLACEHOLDER_ID,
          type: 'typing',
        },
        ...messageItems,
      ];
    }

    return messageItems;
  }, [state.isAwaitingResponse, state.messages]);

  const typingPlaceholderMessage = useMemo<Message>(
    () => ({
      id: TYPING_PLACEHOLDER_ID,
      sessionId: state.sessionId ?? 'pending-session',
      sender: 'ai',
      content: '',
      safetyFlags: [],
      createdAt: new Date().toISOString(),
    }),
    [state.sessionId]
  );

  const handleSend = useCallback(
    async (text: string, inputSource: 'keyboard' | 'voice' = 'keyboard') => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      await sendMessage(text, inputSource);
    },
    [sendMessage]
  );

  const handleSendQuiz = useCallback(
    async (topic: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      await sendQuizRequest(topic);
    },
    [sendQuizRequest]
  );

  const handleLongPressMessage = useCallback((content: string) => {
    void Haptics.selectionAsync().catch(() => undefined);

    const webClipboard = (globalThis as { navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } } })
      .navigator?.clipboard;

    if (Platform.OS === 'web' && typeof webClipboard?.writeText === 'function') {
      void webClipboard.writeText(content);
    }
  }, []);

  const renderItem: ListRenderItem<ChatListItem> = ({ item }) => {
    if (item.type === 'typing') {
      return <MessageBubble message={typingPlaceholderMessage} isTypingPlaceholder ageGroup={profile?.ageGroup} />;
    }

    return (
      <MessageBubble
        message={item.message}
        ageGroup={profile?.ageGroup}
        onLongPressMessage={handleLongPressMessage}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingBottom: childTabSceneBottomPadding }]}>
          <SessionHeader
            subjectName={resolvedSubjectName}
            elapsedSeconds={elapsedSeconds}
            minutesRemaining={minutesRemaining}
          />

          {state.error ? (
            <Pressable onPress={clearError} style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.errorText} />
              <Text style={styles.errorText}>{state.error}</Text>
            </Pressable>
          ) : null}

          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.messagesContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="robot-happy-outline" size={44} color={Colors.primary} />
                <Text style={styles.emptyTitle}>Ask your first question</Text>
                <Text style={styles.emptySubtitle}>I can help with math, reading, science, and more.</Text>
              </View>
            }
          />

          <ChatInput
            value={state.inputText}
            ageGroup={profile?.ageGroup ?? '7-11'}
            isLoading={state.isAwaitingResponse || state.isLoading}
            onChangeText={setInputText}
            onSend={handleSend}
            onSendQuiz={handleSendQuiz}
            onTranscribeAudio={transcribeRecording}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  messagesContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  emptyState: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
