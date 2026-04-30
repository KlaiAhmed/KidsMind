import * as Speech from 'expo-speech';
import type { AgeGroup } from '@/types/child';

type TtsListener = (activeMessageId: string | null) => void;

const listeners = new Set<TtsListener>();
let activeMessageId: string | null = null;

function getRate(ageGroup: AgeGroup): number {
  return ageGroup === '3-6' ? 0.8 : 0.95;
}

function notifyAll(id: string | null) {
  for (const listener of listeners) {
    listener(id);
  }
}

export function ttsSpeak(
  text: string,
  ageGroup: AgeGroup,
  messageId: string,
) {
  if (activeMessageId === messageId) {
    ttsStop();
    return;
  }

  Speech.stop();
  activeMessageId = messageId;
  notifyAll(messageId);

  Speech.speak(text, {
    language: 'en',
    rate: getRate(ageGroup),
    onDone() {
      if (activeMessageId === messageId) {
        activeMessageId = null;
        notifyAll(null);
      }
    },
    onStopped() {
      if (activeMessageId === messageId) {
        activeMessageId = null;
        notifyAll(null);
      }
    },
    onError() {
      if (activeMessageId === messageId) {
        activeMessageId = null;
        notifyAll(null);
      }
    },
  });
}

export function ttsStop() {
  Speech.stop();
  activeMessageId = null;
  notifyAll(null);
}

export function ttsSubscribe(listener: TtsListener): () => void {
  listeners.add(listener);
  listener(activeMessageId);
  return () => {
    listeners.delete(listener);
  };
}
