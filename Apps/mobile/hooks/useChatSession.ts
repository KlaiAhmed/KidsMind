// Apps/mobile/hooks/useChatSession.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endChatSession, sendChatMessage, startChatSession } from '@/services/chatService';
import type { AgeGroup } from '@/types/child';
import type { ChatState, ConversationContextEntry, Message, Session } from '@/types/chat';

const MAX_CONTEXT_MESSAGES = 20;
const MIN_TYPING_INDICATOR_MS = 500;

interface SubjectContext {
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
}

interface UseChatSessionOptions {
  childId: string | null;
  ageGroup: AgeGroup;
  gradeLevel: string;
  subjectContext?: SubjectContext;
  dailyLimitMinutes?: number;
}

interface UseChatSessionResult {
  state: ChatState;
  session: Session | null;
  elapsedSeconds: number;
  minutesRemaining: number | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  setInputText: (text: string) => void;
  clearError: () => void;
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function buildConversationWindow(messages: Message[]): ConversationContextEntry[] {
  return messages.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
    sender: message.sender,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

function buildInitialChatState(): ChatState {
  return {
    sessionId: null,
    messages: [],
    isLoading: false,
    isAwaitingResponse: false,
    error: null,
    inputText: '',
    sessionStartedAt: null,
  };
}

export function useChatSession({
  childId,
  ageGroup,
  gradeLevel,
  subjectContext,
  dailyLimitMinutes,
}: UseChatSessionOptions): UseChatSessionResult {
  const [state, setState] = useState<ChatState>(buildInitialChatState);
  const [session, setSession] = useState<Session | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const mountedRef = useRef<boolean>(true);
  const sessionRef = useRef<Session | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const endingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  const setInputText = useCallback((text: string) => {
    setState((current) => ({
      ...current,
      inputText: text,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
    }));
  }, []);

  const startSession = useCallback(async () => {
    if (!childId || sessionRef.current) {
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const startedSession = await startChatSession(childId);
      if (!mountedRef.current) {
        return;
      }

      endingRef.current = false;
      setSession(startedSession);
      setState((current) => ({
        ...current,
        sessionId: startedSession.id,
        sessionStartedAt: startedSession.startedAt,
        isLoading: false,
        error: null,
      }));
    } catch {
      if (!mountedRef.current) {
        return;
      }

      // Local fallback keeps the chat UI responsive even when network is unavailable.
      const localSession: Session = {
        id: `local-session-${Date.now()}`,
        childId,
        startedAt: new Date().toISOString(),
      };

      endingRef.current = false;
      setSession(localSession);
      setState((current) => ({
        ...current,
        sessionId: localSession.id,
        sessionStartedAt: localSession.startedAt,
        isLoading: false,
        error: 'Live session could not be started. Messages may not sync until connection returns.',
      }));
    }
  }, [childId]);

  const endSession = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || endingRef.current) {
      return;
    }

    endingRef.current = true;

    try {
      const response = await endChatSession(activeSession.id);
      if (!mountedRef.current) {
        return;
      }

      setSession((current) =>
        current && current.id === activeSession.id
          ? {
              ...current,
              endedAt: response.endedAt ?? new Date().toISOString(),
              totalSeconds: response.totalSeconds ?? elapsedSeconds,
            }
          : current
      );
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setSession((current) =>
        current && current.id === activeSession.id
          ? {
              ...current,
              endedAt: new Date().toISOString(),
              totalSeconds: elapsedSeconds,
            }
          : current
      );
    } finally {
      if (mountedRef.current) {
        setState((current) => ({
          ...current,
          isAwaitingResponse: false,
          isLoading: false,
        }));
      }
    }
  }, [elapsedSeconds]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !childId) {
        return;
      }

      if (!sessionRef.current) {
        await startSession();
      }

      const activeSession = sessionRef.current;
      if (!activeSession) {
        setState((current) => ({
          ...current,
          error: 'Unable to start chat right now. Please try again in a moment.',
        }));
        return;
      }

      const optimisticMessage: Message = {
        id: `child-${Date.now()}`,
        sessionId: activeSession.id,
        sender: 'child',
        content: text,
        safetyFlags: [],
        createdAt: new Date().toISOString(),
      };

      const contextualMessages = [...messagesRef.current, optimisticMessage];
      messagesRef.current = contextualMessages;

      setState((current) => ({
        ...current,
        messages: contextualMessages,
        inputText: '',
        isAwaitingResponse: true,
        error: null,
      }));

      const startedRequestAt = Date.now();

      try {
        const response = await sendChatMessage({
          childId,
          sessionId: activeSession.id,
          text,
          context: {
            ageGroup,
            gradeLevel,
            subjectId: subjectContext?.subjectId,
            subjectName: subjectContext?.subjectName,
            topicId: subjectContext?.topicId,
            conversation: buildConversationWindow(contextualMessages),
          },
        });

        const elapsed = Date.now() - startedRequestAt;
        if (elapsed < MIN_TYPING_INDICATOR_MS) {
          await waitMs(MIN_TYPING_INDICATOR_MS - elapsed);
        }

        if (!mountedRef.current) {
          return;
        }

        const aiMessage: Message = {
          id: response.messageId,
          sessionId: activeSession.id,
          sender: 'ai',
          content: response.content,
          safetyFlags: response.safetyFlags,
          createdAt: response.createdAt,
        };

        const nextMessages = [...messagesRef.current, aiMessage];
        messagesRef.current = nextMessages;

        setState((current) => ({
          ...current,
          messages: nextMessages,
          isAwaitingResponse: false,
          error: null,
        }));
      } catch {
        const elapsed = Date.now() - startedRequestAt;
        if (elapsed < MIN_TYPING_INDICATOR_MS) {
          await waitMs(MIN_TYPING_INDICATOR_MS - elapsed);
        }

        if (!mountedRef.current) {
          return;
        }

        setState((current) => ({
          ...current,
          isAwaitingResponse: false,
          error: 'I had trouble reaching your AI tutor. Please try sending your message again.',
        }));
      }
    },
    [ageGroup, childId, gradeLevel, startSession, subjectContext?.subjectId, subjectContext?.subjectName, subjectContext?.topicId]
  );

  useEffect(() => {
    if (!childId) {
      setSession(null);
      setState(buildInitialChatState());
      setElapsedSeconds(0);
      endingRef.current = false;
      return;
    }

    void startSession();
  }, [childId, startSession]);

  useEffect(() => {
    if (!session?.startedAt || session.endedAt) {
      return;
    }

    const updateElapsed = () => {
      const startedAtMs = new Date(session.startedAt).getTime();
      const nextElapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setElapsedSeconds(nextElapsed);
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session?.endedAt, session?.startedAt]);

  const minutesRemaining = useMemo(() => {
    if (typeof dailyLimitMinutes !== 'number' || dailyLimitMinutes <= 0) {
      return null;
    }

    const usedMinutes = Math.floor(elapsedSeconds / 60);
    return Math.max(0, dailyLimitMinutes - usedMinutes);
  }, [dailyLimitMinutes, elapsedSeconds]);

  return {
    state,
    session,
    elapsedSeconds,
    minutesRemaining,
    startSession,
    endSession,
    sendMessage,
    setInputText,
    clearError,
  };
}
