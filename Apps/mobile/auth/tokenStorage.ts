import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'kidsmind.refresh_token';
let inMemoryRefreshToken: string | null = null;

function hasSecureStoreMethods(): boolean {
  return (
    typeof SecureStore.getItemAsync === 'function' &&
    typeof SecureStore.setItemAsync === 'function' &&
    typeof SecureStore.deleteItemAsync === 'function'
  );
}

function getWebLocalStorage(): Storage | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

async function setFallbackToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebLocalStorage();
    if (storage) {
      storage.setItem(REFRESH_TOKEN_KEY, token);
    }
    inMemoryRefreshToken = token;
    return;
  }

  inMemoryRefreshToken = token;
}

async function getFallbackToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const storage = getWebLocalStorage();
    if (storage) {
      const value = storage.getItem(REFRESH_TOKEN_KEY);
      inMemoryRefreshToken = value;
      return value;
    }
  }

  return inMemoryRefreshToken;
}

async function clearFallbackToken(): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebLocalStorage();
    if (storage) {
      storage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  inMemoryRefreshToken = null;
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (hasSecureStoreMethods()) {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      return;
    } catch {
      // Fallback covers web and non-native environments where SecureStore is unavailable.
    }
  }

  await setFallbackToken(token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (hasSecureStoreMethods()) {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Fallback covers web and non-native environments where SecureStore is unavailable.
    }
  }

  return getFallbackToken();
}

export async function clearRefreshToken(): Promise<void> {
  if (hasSecureStoreMethods()) {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return;
    } catch {
      // Fallback covers web and non-native environments where SecureStore is unavailable.
    }
  }

  await clearFallbackToken();
}