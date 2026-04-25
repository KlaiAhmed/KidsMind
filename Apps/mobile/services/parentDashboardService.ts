import { apiRequest } from '@/services/apiClient';
import type {
  ChildProfile,
  NotificationPrefs,
  ParentHistory,
  ParentOverview,
  ParentProgress,
} from '@/types/child';

interface AvatarDownloadApiResponse {
  avatar_id: string;
  name: string;
  file_path: string;
  url: string;
  expires_in_seconds: number;
}

interface ChatHistoryMessageApiResponse {
  role: string;
  content: string;
  created_at: string | null;
}

interface ChatHistorySessionApiResponse {
  session_id: string;
  messages: ChatHistoryMessageApiResponse[];
}

interface ChatHistoryApiResponse {
  child_id: string;
  sessions: ChatHistorySessionApiResponse[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ParentConversationMessage {
  id: string;
  sender: 'child' | 'ai';
  body: string;
  createdAt: string | null;
  safetyFlagDescription: string | null;
}

export interface ParentConversationSession {
  id: string;
  title: string;
  preview: string;
  startedAt: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  hasSafetyFlags: boolean;
  messages: ParentConversationMessage[];
}

export interface ParentConversationHistory {
  childId: string;
  sessions: ParentConversationSession[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const STRUCTURED_RESPONSE_FIELDS = [
  ['explanation', null],
  ['example', 'Example'],
  ['exercise', 'Exercise'],
  ['encouragement', 'Encouragement'],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenAssistantPayload(payload: Record<string, unknown>): {
  body: string;
  safetyFlagDescription: string | null;
} {
  const sections = STRUCTURED_RESPONSE_FIELDS.flatMap(([field, label]) => {
    const value = normalizeOptionalString(payload[field]);
    if (!value) {
      return [];
    }

    return [label ? `${label}: ${value}` : value];
  });

  const safetyFlags = Array.isArray(payload.safety_flags)
    ? payload.safety_flags.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];

  return {
    body: sections.join('\n\n').trim(),
    safetyFlagDescription: safetyFlags.length > 0 ? safetyFlags.join(', ') : null,
  };
}

function normalizeMessage(
  message: ChatHistoryMessageApiResponse,
  sessionId: string,
  index: number,
): ParentConversationMessage {
  const sender = message.role === 'assistant' ? 'ai' : 'child';
  const rawBody = normalizeOptionalString(message.content) ?? '';
  const parsedContent = safeJsonParse(rawBody);
  const structuredAssistantContent =
    sender === 'ai' && isRecord(parsedContent) ? flattenAssistantPayload(parsedContent) : null;

  return {
    id: `${sessionId}-${index}`,
    sender,
    body: structuredAssistantContent?.body || rawBody,
    createdAt: normalizeOptionalString(message.created_at),
    safetyFlagDescription: structuredAssistantContent?.safetyFlagDescription ?? null,
  };
}

function buildSessionTitle(sessionId: string, messages: ParentConversationMessage[]): string {
  const firstChildMessage = messages.find((message) => message.sender === 'child' && message.body.trim().length > 0);
  if (firstChildMessage) {
    const normalized = firstChildMessage.body.replace(/\s+/g, ' ').trim();
    return normalized.length > 56 ? `${normalized.slice(0, 53)}...` : normalized;
  }

  return `Conversation ${sessionId.slice(-6)}`;
}

function buildSessionPreview(messages: ParentConversationMessage[]): string {
  const lastMessage = [...messages].reverse().find((message) => message.body.trim().length > 0);
  if (!lastMessage) {
    return 'No messages in this session yet.';
  }

  const normalized = lastMessage.body.replace(/\s+/g, ' ').trim();
  return normalized.length > 84 ? `${normalized.slice(0, 81)}...` : normalized;
}

function normalizeSession(session: ChatHistorySessionApiResponse): ParentConversationSession {
  const messages = session.messages.map((message, index) => normalizeMessage(message, session.session_id, index));
  const createdAtValues = messages
    .map((message) => message.createdAt)
    .filter((value): value is string => typeof value === 'string');
  const lastMessageAt = createdAtValues[createdAtValues.length - 1] ?? null;

  return {
    id: session.session_id,
    title: buildSessionTitle(session.session_id, messages),
    preview: buildSessionPreview(messages),
    startedAt: createdAtValues[0] ?? null,
    lastMessageAt,
    messageCount: messages.length,
    hasSafetyFlags: messages.some((message) => Boolean(message.safetyFlagDescription)),
    messages,
  };
}

export async function getChildAvatarUrl(child: ChildProfile): Promise<string | null> {
  if (!child.avatarId) {
    return null;
  }

  try {
    const response = await apiRequest<AvatarDownloadApiResponse>(
      `/api/v1/media/download/${child.avatarId}?child_id=${encodeURIComponent(child.id)}`,
      {
        method: 'GET',
      },
    );

    return normalizeOptionalString(response.url);
  } catch {
    return null;
  }
}

export async function getChildAvatarMap(
  children: ChildProfile[],
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    children.map(async (child) => [child.id, await getChildAvatarUrl(child)] as const),
  );

  return Object.fromEntries(entries);
}

export async function getConversationHistory(params: {
  userId: number | string;
  childId: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}): Promise<ParentConversationHistory> {
  const searchParams = new URLSearchParams();

  if (params.sessionId) {
    searchParams.set('session_id', params.sessionId);
  }

  searchParams.set('limit', `${params.limit ?? 200}`);
  searchParams.set('offset', `${params.offset ?? 0}`);

  const response = await apiRequest<ChatHistoryApiResponse>(
    `/api/v1/chat/history/${encodeURIComponent(params.userId)}/${encodeURIComponent(params.childId)}?${searchParams.toString()}`,
    {
      method: 'GET',
    },
  );

  const sessions = [...response.sessions]
    .map(normalizeSession)
    .sort((left, right) => {
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      return rightTime - leftTime;
    });

  return {
    childId: response.child_id,
    sessions,
    pagination: {
      limit: response.pagination.limit,
      offset: response.pagination.offset,
      hasMore: response.pagination.has_more,
    },
  };
}

export async function clearConversationSession(params: {
  userId: number | string;
  childId: string;
  sessionId: string;
}): Promise<void> {
  await apiRequest<void>(
    `/api/v1/chat/history/${encodeURIComponent(params.userId)}/${encodeURIComponent(params.childId)}/${encodeURIComponent(params.sessionId)}`,
    {
      method: 'DELETE',
    },
  );
}

interface ParentOverviewStatsApiResponse {
  total_sessions: number;
  total_messages: number;
  total_exercises_completed: number;
  total_xp: number;
  streak_days: number;
  flagged_message_count: number;
  last_active_at: string | null;
}

interface ParentOverviewApiResponse {
  child_id: string;
  child_nickname: string;
  child_xp: number;
  child_level: number;
  stats: ParentOverviewStatsApiResponse;
}

interface DailyUsagePointApiResponse {
  date: string;
  sessions: number;
  messages: number;
  xp_gained: number;
}

interface SubjectMasteryItemApiResponse {
  subject: string;
  sessions: number;
  messages: number;
  xp: number;
}

interface WeeklyInsightApiResponse {
  summary: string;
  top_subject: string | null;
  engagement_level: string;
}

interface SessionMetadataApiResponse {
  session_id: string;
  started_at: string | null;
  ended_at: string | null;
  message_count: number;
  has_flagged_content: boolean;
  subjects: string[];
}

interface ParentProgressApiResponse {
  child_id: string;
  daily_usage: DailyUsagePointApiResponse[];
  subject_mastery: SubjectMasteryItemApiResponse[];
  weekly_insight: WeeklyInsightApiResponse;
  recent_sessions: SessionMetadataApiResponse[];
}

interface ParentHistorySessionApiResponse {
  session_id: string;
  started_at: string | null;
  ended_at: string | null;
  message_count: number;
  has_flagged_content: boolean;
  last_message_at: string | null;
  preview: string;
}

interface ParentHistoryApiResponse {
  child_id: string;
  sessions: ParentHistorySessionApiResponse[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export async function getParentOverview(childId: string): Promise<ParentOverview> {
  const response = await apiRequest<ParentOverviewApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/dashboard/overview`,
    { method: 'GET' },
  );

  return {
    childId: response.child_id,
    childNickname: response.child_nickname,
    childXp: response.child_xp,
    childLevel: response.child_level,
    stats: {
      totalSessions: response.stats.total_sessions,
      totalMessages: response.stats.total_messages,
      totalExercisesCompleted: response.stats.total_exercises_completed,
      totalXp: response.stats.total_xp,
      streakDays: response.stats.streak_days,
      flaggedMessageCount: response.stats.flagged_message_count,
      lastActiveAt: response.stats.last_active_at,
    },
  };
}

export async function getParentProgress(childId: string): Promise<ParentProgress> {
  const response = await apiRequest<ParentProgressApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/dashboard/progress`,
    { method: 'GET' },
  );

  return {
    childId: response.child_id,
    dailyUsage: response.daily_usage.map((d) => ({
      date: d.date,
      sessions: d.sessions,
      messages: d.messages,
      xpGained: d.xp_gained,
    })),
    subjectMastery: response.subject_mastery.map((s) => ({
      subject: s.subject,
      sessions: s.sessions,
      messages: s.messages,
      xp: s.xp,
    })),
    weeklyInsight: {
      summary: response.weekly_insight.summary,
      topSubject: response.weekly_insight.top_subject,
      engagementLevel: response.weekly_insight.engagement_level,
    },
    recentSessions: response.recent_sessions.map((s) => ({
      sessionId: s.session_id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      messageCount: s.message_count,
      hasFlaggedContent: s.has_flagged_content,
      subjects: s.subjects,
    })),
  };
}

export async function getParentHistory(params: {
  childId: string;
  flaggedOnly?: boolean;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ParentHistory> {
  const searchParams = new URLSearchParams();

  if (params.flaggedOnly) {
    searchParams.set('flagged_only', 'true');
  }
  if (params.limit != null) {
    searchParams.set('limit', `${params.limit}`);
  }
  if (params.offset != null) {
    searchParams.set('offset', `${params.offset}`);
  }
  if (params.dateFrom) {
    searchParams.set('date_from', params.dateFrom);
  }
  if (params.dateTo) {
    searchParams.set('date_to', params.dateTo);
  }

  const qs = searchParams.toString();
  const url = `/api/v1/children/${encodeURIComponent(params.childId)}/dashboard/history${qs ? `?${qs}` : ''}`;

  const response = await apiRequest<ParentHistoryApiResponse>(url, { method: 'GET' });

  return {
    childId: response.child_id,
    sessions: response.sessions.map((s) => ({
      sessionId: s.session_id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      messageCount: s.message_count,
      hasFlaggedContent: s.has_flagged_content,
      lastMessageAt: s.last_message_at,
      preview: s.preview,
    })),
    totalCount: response.total_count,
    limit: response.limit,
    offset: response.offset,
    hasMore: response.has_more,
  };
}

interface BulkDeleteApiResponse {
  deleted_count: number;
  not_found_count: number;
}

export async function bulkDeleteSessions(
  childId: string,
  sessionIds: string[],
): Promise<import('@/types/child').BulkDeleteResult> {
  const response = await apiRequest<BulkDeleteApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/dashboard/history/bulk-delete`,
    {
      method: 'POST',
      body: { session_ids: sessionIds },
    },
  );

  return {
    deletedCount: response.deleted_count,
    notFoundCount: response.not_found_count,
  };
}

interface HistoryExportApiResponse {
  child_id: string;
  export_format: string;
  download_url: string | null;
  total_sessions: number;
  total_messages: number;
}

export async function exportHistory(
  childId: string,
  exportFormat: string = 'json',
): Promise<import('@/types/child').HistoryExport> {
  const response = await apiRequest<HistoryExportApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/dashboard/history/export?export_format=${encodeURIComponent(exportFormat)}`,
    { method: 'GET' },
  );

  return {
    childId: response.child_id,
    exportFormat: response.export_format,
    downloadUrl: response.download_url,
    totalSessions: response.total_sessions,
    totalMessages: response.total_messages,
  };
}

interface ChildPauseApiResponse {
  child_id: string;
  is_paused: boolean;
}

export async function pauseChild(childId: string): Promise<import('@/types/child').ChildPauseState> {
  const response = await apiRequest<ChildPauseApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/pause`,
    { method: 'POST' },
  );

  return { childId: response.child_id, isPaused: response.is_paused };
}

export async function resumeChild(childId: string): Promise<import('@/types/child').ChildPauseState> {
  const response = await apiRequest<ChildPauseApiResponse>(
    `/api/v1/children/${encodeURIComponent(childId)}/resume`,
    { method: 'POST' },
  );

  return { childId: response.child_id, isPaused: response.is_paused };
}

interface NotificationPrefsApiResponse {
  daily_summary_enabled: boolean;
  safety_alerts_enabled: boolean;
  weekly_report_enabled: boolean;
  session_start_enabled: boolean;
  session_end_enabled: boolean;
  streak_milestone_enabled: boolean;
  email_channel: boolean;
  push_channel: boolean;
}

export async function getNotificationPrefs(): Promise<import('@/types/child').NotificationPrefs> {
  const response = await apiRequest<NotificationPrefsApiResponse>(
    '/api/v1/children/dashboard/notification-prefs',
    { method: 'GET' },
  );

  return {
    dailySummaryEnabled: response.daily_summary_enabled,
    safetyAlertsEnabled: response.safety_alerts_enabled,
    weeklyReportEnabled: response.weekly_report_enabled,
    sessionStartEnabled: response.session_start_enabled,
    sessionEndEnabled: response.session_end_enabled,
    streakMilestoneEnabled: response.streak_milestone_enabled,
    emailChannel: response.email_channel,
    pushChannel: response.push_channel,
  };
}

export async function updateNotificationPrefs(
  input: import('@/types/child').NotificationPrefsUpdate,
): Promise<import('@/types/child').NotificationPrefs> {
  const body: Record<string, boolean> = {};
  if (input.dailySummaryEnabled != null) body.daily_summary_enabled = input.dailySummaryEnabled;
  if (input.safetyAlertsEnabled != null) body.safety_alerts_enabled = input.safetyAlertsEnabled;
  if (input.weeklyReportEnabled != null) body.weekly_report_enabled = input.weeklyReportEnabled;
  if (input.sessionStartEnabled != null) body.session_start_enabled = input.sessionStartEnabled;
  if (input.sessionEndEnabled != null) body.session_end_enabled = input.sessionEndEnabled;
  if (input.streakMilestoneEnabled != null) body.streak_milestone_enabled = input.streakMilestoneEnabled;
  if (input.emailChannel != null) body.email_channel = input.emailChannel;
  if (input.pushChannel != null) body.push_channel = input.pushChannel;

  const response = await apiRequest<NotificationPrefsApiResponse>(
    '/api/v1/children/dashboard/notification-prefs',
    { method: 'PATCH', body },
  );

  return {
    dailySummaryEnabled: response.daily_summary_enabled,
    safetyAlertsEnabled: response.safety_alerts_enabled,
    weeklyReportEnabled: response.weekly_report_enabled,
    sessionStartEnabled: response.session_start_enabled,
    sessionEndEnabled: response.session_end_enabled,
    streakMilestoneEnabled: response.streak_milestone_enabled,
    emailChannel: response.email_channel,
    pushChannel: response.push_channel,
  };
}

interface ControlAuditEntryApiResponse {
  action: string;
  actor_id: string;
  target_child_id: string;
  detail: string;
  timestamp: string | null;
}

interface ControlAuditApiResponse {
  entries: ControlAuditEntryApiResponse[];
  total_count: number;
  limit: number;
  offset: number;
}

export async function getControlAudit(params?: {
  childId?: string;
  limit?: number;
  offset?: number;
}): Promise<import('@/types/child').ControlAuditLog> {
  const searchParams = new URLSearchParams();
  if (params?.childId) searchParams.set('child_id', params.childId);
  if (params?.limit != null) searchParams.set('limit', `${params.limit}`);
  if (params?.offset != null) searchParams.set('offset', `${params.offset}`);

  const qs = searchParams.toString();
  const url = `/api/v1/children/dashboard/control-audit${qs ? `?${qs}` : ''}`;

  const response = await apiRequest<ControlAuditApiResponse>(url, { method: 'GET' });

  return {
    entries: response.entries.map((e) => ({
      action: e.action,
      actorId: e.actor_id,
      targetChildId: e.target_child_id,
      detail: e.detail,
      timestamp: e.timestamp,
    })),
    totalCount: response.total_count,
    limit: response.limit,
    offset: response.offset,
  };
}
