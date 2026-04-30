import { apiRequest } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';

interface TranscribeVoiceRecordingPayload {
  childId: string;
  sessionId: string;
  audioUri: string;
}

interface TranscribeVoiceResponse {
  transcriptionId: string;
  text: string;
  language: string;
  durationSeconds: number;
}

interface VoiceTranscriptionApiResponse {
  transcription_id?: unknown;
  text?: unknown;
  language?: unknown;
  duration_seconds?: unknown;
}

type ReactNativeFormDataFile = {
  uri: string;
  name: string;
  type: string;
};

function getCurrentUserId(): string {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    throw new Error('You must be signed in to use voice chat.');
  }

  return userId;
}

function getFileExtension(uri: string): string {
  const normalizedPath = uri.split('?')[0] ?? uri;
  const extension = normalizedPath.split('.').pop();
  return extension && extension.length <= 5 ? extension.toLowerCase() : 'm4a';
}

function getAudioContentType(extension: string): string {
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'ogg':
      return 'audio/ogg';
    case 'mp4':
      return 'audio/mp4';
    case 'm4a':
    default:
      return 'audio/m4a';
  }
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export async function transcribeVoiceRecording({
  childId,
  sessionId,
  audioUri,
}: TranscribeVoiceRecordingPayload): Promise<TranscribeVoiceResponse> {
  const userId = getCurrentUserId();
  const extension = getFileExtension(audioUri);
  const file: ReactNativeFormDataFile = {
    uri: audioUri,
    name: `kidsmind-recording.${extension}`,
    type: getAudioContentType(extension),
  };
  const formData = new FormData();

  formData.append('audio_file', file as unknown as Blob);
  formData.append('child_id', childId);

  const response = await apiRequest<VoiceTranscriptionApiResponse>(
    `/api/v1/voice/${encodeURIComponent(userId)}/${encodeURIComponent(childId)}/${encodeURIComponent(sessionId)}/transcribe/sync`,
    {
      method: 'POST',
      body: formData,
      timeoutMs: 45000,
    },
  );

  return {
    transcriptionId: normalizeString(response.transcription_id, `transcription-${Date.now()}`),
    text: normalizeString(response.text, ''),
    language: normalizeString(response.language, 'unknown'),
    durationSeconds:
      typeof response.duration_seconds === 'number' && Number.isFinite(response.duration_seconds)
        ? response.duration_seconds
        : 0,
  };
}
