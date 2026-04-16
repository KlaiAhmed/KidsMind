// Apps/mobile/types/chat.ts
import type { AgeGroup } from '@/types/child';

export type MessageSender = 'child' | 'ai';

export type SafetyFlag = string;

export interface Message {
  id: string;
  sessionId: string;
  sender: MessageSender;
  content: string;
  safetyFlags: SafetyFlag[];
  createdAt: string;
}

export interface Session {
  id: string;
  childId: string;
  startedAt: string;
  endedAt?: string;
  totalSeconds?: number;
}

export interface ChatState {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  isAwaitingResponse: boolean;
  error: string | null;
  inputText: string;
  sessionStartedAt: string | null;
}

export interface ConversationContextEntry {
  sender: MessageSender;
  content: string;
  createdAt: string;
}

export interface ChatRequestContext {
  ageGroup: AgeGroup;
  gradeLevel: string;
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  conversation: ConversationContextEntry[];
}

export interface ChatRequestPayload {
  childId: string;
  sessionId: string;
  text: string;
  context: ChatRequestContext;
}

export interface ChatMessageResponse {
  messageId: string;
  content: string;
  safetyFlags: SafetyFlag[];
  createdAt: string;
}
