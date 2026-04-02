import { apiClient } from '../../lib/api';
import { invalidateQuery, useApiMutation, type UseApiMutationResult } from './core';

export interface PatchSettingsPayload {
  username?: string;
  country?: string;
  timezone?: string;
  default_language?: string;
  notifications_email?: boolean;
  notifications_push?: boolean;
  consent_analytics?: boolean;
}

export interface PatchSettingsResponse {
  success: boolean;
  message?: string;
}

export type UsePatchSettingsResult = UseApiMutationResult<PatchSettingsResponse, PatchSettingsPayload>;

export const usePatchSettings = (): UsePatchSettingsResult => {
  return useApiMutation<PatchSettingsResponse, PatchSettingsPayload>(async (payload) => {
    const response = await apiClient.patch<PatchSettingsResponse>('/api/v1/users/me/settings', {
      body: payload,
    });

    invalidateQuery('current-user:');

    return response.data;
  });
};
