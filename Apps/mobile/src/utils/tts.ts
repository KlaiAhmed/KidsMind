import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { synthesizeVoiceTtsAudioFile } from '@/services/voiceService';

export interface TtsState {
  activeMessageId: string | null;
  loadingMessageId: string | null;
  errorMessageId: string | null;
  error: string | null;
}

interface TtsSpeakParams {
  text: string;
  childId: string | null | undefined;
  sessionId: string;
  messageId: string;
  language?: string;
  voiceEnabled?: boolean;
}

type TtsListener = (state: TtsState) => void;
type PlayerSubscription = { remove: () => void };
type PlayerWithStatusEvents = AudioPlayer & {
  addListener: (
    eventName: 'playbackStatusUpdate',
    listener: (status: AudioStatus) => void,
  ) => PlayerSubscription;
};

const listeners = new Set<TtsListener>();

let ttsState: TtsState = {
  activeMessageId: null,
  loadingMessageId: null,
  errorMessageId: null,
  error: null,
};
let activePlayer: AudioPlayer | null = null;
let activePlayerSubscription: PlayerSubscription | null = null;
let activeAudioUri: string | null = null;
let activeRequestController: AbortController | null = null;

function getStateSnapshot(): TtsState {
  return { ...ttsState };
}

function notifyAll() {
  const snapshot = getStateSnapshot();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function setTtsState(nextState: Partial<TtsState>) {
  ttsState = {
    ...ttsState,
    ...nextState,
  };
  notifyAll();
}

function deleteAudioFile(audioUri: string | null) {
  if (!audioUri) {
    return;
  }

  void FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(() => undefined);
}

function cleanupPlayer() {
  activePlayerSubscription?.remove();
  activePlayerSubscription = null;

  if (activePlayer) {
    try {
      activePlayer.pause();
    } catch (error) {
      void error;
    }

    try {
      activePlayer.remove();
    } catch (error) {
      void error;
    }

    activePlayer = null;
  }

  const audioUri = activeAudioUri;
  activeAudioUri = null;
  deleteAudioFile(audioUri);
}

function getReadableError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    if (error.message === 'Network request failed.') {
      return 'Read aloud needs a connection. Please try again.';
    }

    if (error.message === 'Request timed out.') {
      return 'Read aloud took too long. Please try again.';
    }

    return error.message;
  }

  return 'Read aloud is unavailable right now. Please try again.';
}

export async function ttsSpeak({
  text,
  childId,
  sessionId,
  messageId,
  language = 'en',
  voiceEnabled = true,
}: TtsSpeakParams): Promise<void> {
  const normalizedText = text.trim();

  if (!voiceEnabled) {
    return;
  }

  if (ttsState.loadingMessageId === messageId) {
    return;
  }

  if (ttsState.activeMessageId === messageId) {
    ttsStop();
    return;
  }

  if (!normalizedText || !childId || !sessionId) {
    setTtsState({
      activeMessageId: null,
      loadingMessageId: null,
      errorMessageId: messageId,
      error: 'This answer cannot be read aloud right now.',
    });
    return;
  }

  activeRequestController?.abort();
  activeRequestController = null;
  cleanupPlayer();

  const controller = new AbortController();
  activeRequestController = controller;

  setTtsState({
    activeMessageId: null,
    loadingMessageId: messageId,
    errorMessageId: null,
    error: null,
  });

  try {
    const { audioUri } = await synthesizeVoiceTtsAudioFile({
      childId,
      sessionId,
      text: normalizedText,
      language,
      signal: controller.signal,
    });

    if (controller.signal.aborted || activeRequestController !== controller) {
      deleteAudioFile(audioUri);
      return;
    }

    activeRequestController = null;

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);

    const player = createAudioPlayer({ uri: audioUri }, { updateInterval: 250 });
    activePlayer = player;
    activeAudioUri = audioUri;
    activePlayerSubscription = (player as PlayerWithStatusEvents).addListener('playbackStatusUpdate', (status) => {
      const finished =
        status.didJustFinish ||
        (status.duration > 0 && status.currentTime >= status.duration && !status.playing);

      if (finished && ttsState.activeMessageId === messageId) {
        cleanupPlayer();
        setTtsState({
          activeMessageId: null,
          loadingMessageId: null,
        });
      }
    });

    player.play();

    setTtsState({
      activeMessageId: messageId,
      loadingMessageId: null,
      errorMessageId: null,
      error: null,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }

    if (activeRequestController === controller) {
      activeRequestController = null;
    }

    cleanupPlayer();
    setTtsState({
      activeMessageId: null,
      loadingMessageId: null,
      errorMessageId: messageId,
      error: getReadableError(error),
    });
  }
}

export function ttsStop() {
  activeRequestController?.abort();
  activeRequestController = null;
  cleanupPlayer();
  setTtsState({
    activeMessageId: null,
    loadingMessageId: null,
  });
}

export function ttsSubscribe(listener: TtsListener): () => void {
  listeners.add(listener);
  listener(getStateSnapshot());
  return () => {
    listeners.delete(listener);
  };
}
