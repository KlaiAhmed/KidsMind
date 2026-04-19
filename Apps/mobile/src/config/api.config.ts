import Constants from 'expo-constants';

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes';
  }

  return false;
}

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

// Expo only auto-injects EXPO_PUBLIC_* into the JS bundle; IS_PROD is injected through app config extra.
const IS_PROD = parseBooleanFlag(Constants.expoConfig?.extra?.IS_PROD);

const productionBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const developmentBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_IP_URL);

// When IS_PROD=false, mobile traffic targets the local network IP; otherwise it uses the production URL.
export const BASE_URL = IS_PROD ? productionBaseUrl : developmentBaseUrl;

if (!BASE_URL) {
  console.warn(
    '[api.config] BASE_URL is undefined. Check EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_API_BASE_IP_URL, and IS_PROD.'
  );
}

export const API_ENV = {
  IS_PROD,
} as const;
