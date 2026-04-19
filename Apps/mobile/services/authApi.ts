import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  RefreshRequest,
  UserSummaryResponse,
} from '@/auth/types';
import { apiRequest } from '@/services/apiClient';

const AUTH_BASE_PATH = '/api/mobile/auth';
const USERS_BASE_PATH = '/api/v1/users';

function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function login(payload: LoginRequest): Promise<AuthTokenResponse> {
  const response = await apiRequest<AuthTokenResponse>(`${AUTH_BASE_PATH}/login`, {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
      captcha_token: payload.captchaToken,
      pow_token: payload.powToken,
    },
    skipAuthRefresh: true,
    skipAuthToken: true,
  });

  return response;
}

export async function register(payload: RegisterRequest): Promise<AuthTokenResponse> {
  const timeZone = payload.timezone ?? getDeviceTimeZone();
  const response = await apiRequest<AuthTokenResponse>(`${AUTH_BASE_PATH}/register`, {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.confirmPassword,
      country: payload.countryCode,
      timezone: timeZone,
      agreed_to_terms: payload.agreeToTerms,
    },
    skipAuthRefresh: true,
    skipAuthToken: true,
  });

  return response;
}

export async function refreshToken(payload: RefreshRequest): Promise<AuthTokenResponse> {
  const response = await apiRequest<AuthTokenResponse>(`${AUTH_BASE_PATH}/refresh`, {
    method: 'POST',
    body: {
      refresh_token: payload.refreshToken,
    },
    headers: {
      Authorization: `Bearer ${payload.refreshToken}`,
    },
    skipAuthRefresh: true,
    skipAuthToken: true,
  });

  return response;
}

export async function logout(payload: RefreshRequest): Promise<void> {
  await apiRequest<void>(`${AUTH_BASE_PATH}/logout`, {
    method: 'POST',
    body: {
      refresh_token: payload.refreshToken,
    },
    headers: {
      Authorization: `Bearer ${payload.refreshToken}`,
    },
    skipAuthRefresh: true,
    skipAuthToken: true,
  });
}

export async function getCurrentUserSummary(): Promise<UserSummaryResponse> {
  return apiRequest<UserSummaryResponse>(`${USERS_BASE_PATH}/me/summary`, {
    method: 'GET',
  });
}