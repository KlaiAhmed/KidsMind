// Apps/mobile/services/chatService.ts
import { apiRequest } from '@/services/apiClient';
import type { ChatMessageResponse, ChatRequestPayload, Session } from '@/types/chat';

interface StartSessionApiResponse {
  session_id?: string;
  id?: string;
  started_at?: string;
  start_at?: string;
}

interface EndSessionApiResponse {
  ended_at?: string;
  total_seconds?: number;
}

interface SendMessageApiResponse {
  message_id?: string;
  id?: string;
  content?: string;
  message?: string;
  safety_flags?: string[];
  created_at?: string;
}

function toChatMessageResponse(
  payload: SendMessageApiResponse,
  fallbackSessionId: string
): ChatMessageResponse {
  return {
    messageId: payload.message_id ?? payload.id ?? `msg-${Date.now()}`,
    content: payload.content ?? payload.message ?? '',
    safetyFlags: Array.isArray(payload.safety_flags) ? payload.safety_flags : [],
    createdAt: payload.created_at ?? new Date().toISOString(),
  };
}

export async function startChatSession(childId: string): Promise<Session> {
  const response = await apiRequest<StartSessionApiResponse>('/sessions/start', {
    method: 'POST',
    body: {
      child_id: childId,
    },
  });

  const sessionId = response.session_id ?? response.id ?? `session-${Date.now()}`;

  return {
    id: sessionId,
    childId,
    startedAt: response.started_at ?? response.start_at ?? new Date().toISOString(),
  };
}

export async function endChatSession(sessionId: string): Promise<{ endedAt?: string; totalSeconds?: number }> {
  const response = await apiRequest<EndSessionApiResponse>('/sessions/end', {
    method: 'POST',
    body: {
      session_id: sessionId,
    },
  });

  return {
    endedAt: response.ended_at,
    totalSeconds: response.total_seconds,
  };
}

export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatMessageResponse> {
  const response = await apiRequest<SendMessageApiResponse>('/chat/message', {
    method: 'POST',
    body: {
      child_id: payload.childId,
      session_id: payload.sessionId,
      text: payload.text,
      context: {
        age_group: payload.context.ageGroup,
        grade_level: payload.context.gradeLevel,
        subject_id: payload.context.subjectId,
        subject_name: payload.context.subjectName,
        topic_id: payload.context.topicId,
        conversation: payload.context.conversation.map((entry) => ({
          sender: entry.sender,
          content: entry.content,
          created_at: entry.createdAt,
        })),
      },
    },
  });

  return toChatMessageResponse(response, payload.sessionId);
}
