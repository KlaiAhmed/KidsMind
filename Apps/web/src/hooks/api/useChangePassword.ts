import { apiClient } from '../../lib/api';
import { useApiMutation, type UseApiMutationResult } from './core';

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export type UseChangePasswordResult = UseApiMutationResult<ChangePasswordResponse, ChangePasswordPayload>;

export const useChangePassword = (): UseChangePasswordResult => {
  return useApiMutation<ChangePasswordResponse, ChangePasswordPayload>(async (payload) => {
    const response = await apiClient.post<ChangePasswordResponse>('/api/v1/users/me/change-password', {
      body: payload,
    });

    return response.data;
  });
};
