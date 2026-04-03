import { apiClient } from '../../lib/api';
import { authStore } from '../../store/auth.store';
import { useApiQuery, type UseApiQueryResult } from './core';

export interface CurrentUserSettings {
  country?: string;
  timezone?: string;
  default_language?: string;
  defaultLanguage?: string;
  notifications_email?: boolean;
  notifications_push?: boolean;
  consent_analytics?: boolean;
}

export interface CurrentUser {
  id: number;
  email: string;
  username: string;
  mfa_enabled?: boolean;
  settings?: CurrentUserSettings;
}

export type UseCurrentUserResult = UseApiQueryResult<CurrentUser | null>;

const normalizeUser = (payload: CurrentUser | { user?: CurrentUser }): CurrentUser | null => {
  if (
    typeof (payload as CurrentUser).id === 'number'
    && typeof (payload as CurrentUser).email === 'string'
    && typeof (payload as CurrentUser).username === 'string'
  ) {
    return payload as CurrentUser;
  }

  if ('user' in payload) {
    return payload.user ?? null;
  }

  return null;
};

export const useCurrentUser = (): UseCurrentUserResult => {
  return useApiQuery<CurrentUser | null>({
    queryKey: 'current-user:summary',
    staleTime: 60 * 1000,
    queryFn: async (signal) => {
      const response = await apiClient.get<CurrentUser | { user?: CurrentUser }>('/api/v1/users/me/summary', { signal });
      const user = normalizeUser(response.data);

      if (user) {
        authStore.setUser({
          id: user.id,
          username: user.username,
          email: user.email,
        });
        authStore.setAuthenticated(true);
      } else {
        authStore.setUser(null);
        authStore.setAuthenticated(false);
      }

      return {
        ...response,
        data: user,
      };
    },
  });
};
