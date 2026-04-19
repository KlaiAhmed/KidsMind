import { create } from 'zustand';

import type { AuthTokenResponse, AuthUser } from '@/auth/types';

function computeIsAuthenticated(accessToken: string | null, user: AuthUser | null): boolean {
  return Boolean(accessToken && user);
}

interface SessionPayload {
  accessToken: string;
  user: AuthUser;
}

interface AuthStoreState {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  authError: string | null;
  setLoading: (isLoading: boolean) => void;
  setAuthError: (message: string | null) => void;
  setAuthenticatedFromTokenResponse: (payload: AuthTokenResponse) => void;
  setSession: (payload: SessionPayload) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  isLoading: true,
  isAuthenticated: false,
  accessToken: null,
  user: null,
  authError: null,
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (message) => set({ authError: message }),
  setAuthenticatedFromTokenResponse: (payload) =>
    set({
      isLoading: false,
      accessToken: payload.access_token,
      user: payload.user,
      isAuthenticated: computeIsAuthenticated(payload.access_token, payload.user),
      authError: null,
    }),
  setSession: (payload) =>
    set({
      isLoading: false,
      accessToken: payload.accessToken,
      user: payload.user,
      isAuthenticated: computeIsAuthenticated(payload.accessToken, payload.user),
      authError: null,
    }),
  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: computeIsAuthenticated(state.accessToken, user),
    })),
  clearAuth: () =>
    set({
      isLoading: false,
      isAuthenticated: false,
      accessToken: null,
      user: null,
      authError: null,
    }),
}));
