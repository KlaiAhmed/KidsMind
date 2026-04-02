import { apiClient } from '../../lib/api';
import { useApiMutation, type UseApiMutationResult } from './core';

export interface EnableMfaResponse {
  mfa_enabled: boolean;
  qr_code_url: string;
  backup_codes: string[];
}

export type UseEnableMfaResult = UseApiMutationResult<EnableMfaResponse, void>;

export const useEnableMfa = (): UseEnableMfaResult => {
  return useApiMutation<EnableMfaResponse, void>(async () => {
    const response = await apiClient.post<EnableMfaResponse>('/api/v1/users/me/mfa/enable', {
      body: {},
    });

    return response.data;
  });
};
