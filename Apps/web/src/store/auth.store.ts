import { useSyncExternalStore } from 'react';
import { clearParentProfileAccess } from '../utils/parentProfileAccess';
import { clearCsrfToken } from '../utils/csrf';
import { dispatchAuthStateChanged } from '../utils/authEvents';

export interface AuthUser {
  id?: number;
  username?: string;
  email?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

export interface LogoutOptions {
  redirectToLogin?: boolean;
}

type AuthListener = () => void;

const AUTH_INITIAL_STATE: AuthState = {
  isAuthenticated: false,
  user: null,
};

let authState: AuthState = AUTH_INITIAL_STATE;
const listeners = new Set<AuthListener>();

const emitChange = (): void => {
  listeners.forEach((listener) => listener());
};

const setAuthState = (next: AuthState): void => {
  authState = next;
  emitChange();
};

const getAuthState = (): AuthState => authState;

const subscribeAuth = (listener: AuthListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setAuthenticated = (isAuthenticated: boolean): void => {
  setAuthState({
    ...authState,
    isAuthenticated,
  });
  dispatchAuthStateChanged();
};

const setUser = (user: AuthUser | null): void => {
  setAuthState({
    ...authState,
    user,
    isAuthenticated: Boolean(user ?? authState.isAuthenticated),
  });
};

const logout = (options?: LogoutOptions): void => {
  clearCsrfToken();
  clearParentProfileAccess();
  setAuthState(AUTH_INITIAL_STATE);
  dispatchAuthStateChanged();

  if (typeof window !== 'undefined' && options?.redirectToLogin !== false) {
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
};

const useAuthStore = (): AuthState => {
  return useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
};

export const authStore = {
  getState: getAuthState,
  subscribe: subscribeAuth,
  setAuthenticated,
  setUser,
  logout,
};

export { useAuthStore };
