import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../utils/api';
import { getCsrfToken } from '../utils/csrf';
import { AUTH_STATE_CHANGED_EVENT } from '../utils/authEvents';
import { logoutAuthSession, refreshAuthSession } from '../lib/authSession';

const AUTH_STATUS_CACHE_TTL_MS = 15_000;
const AUTH_CHECK_ABORT_GRACE_MS = 200;

interface AuthStatusCacheEntry {
  isAuthenticated: boolean;
  cachedAt: number;
}

let authStatusCache: AuthStatusCacheEntry | null = null;
let sharedAuthCheckPromise: Promise<boolean> | null = null;
let sharedAuthCheckController: AbortController | null = null;
let authCheckObserverCount = 0;
let authCheckAbortTimer: ReturnType<typeof setTimeout> | null = null;

const isAbortError = (error: unknown): boolean => {
  return typeof DOMException !== 'undefined'
    && error instanceof DOMException
    && error.name === 'AbortError';
};

const fetchSummary = async (signal: AbortSignal): Promise<Response> => {
  return fetch(`${apiBaseUrl}/api/v1/users/me/summary`, {
    method: 'GET',
    headers: {
      'X-Client-Type': 'web',
    },
    credentials: 'include',
    signal,
  });
};

const clearAuthAbortTimer = (): void => {
  if (!authCheckAbortTimer) {
    return;
  }

  clearTimeout(authCheckAbortTimer);
  authCheckAbortTimer = null;
};

const trackAuthCheckObserver = (): void => {
  clearAuthAbortTimer();
  authCheckObserverCount += 1;
};

const cancelSharedAuthCheck = (): void => {
  clearAuthAbortTimer();

  if (!sharedAuthCheckController) {
    return;
  }

  sharedAuthCheckController.abort();
  sharedAuthCheckController = null;
  sharedAuthCheckPromise = null;
};

const untrackAuthCheckObserver = (): void => {
  authCheckObserverCount = Math.max(0, authCheckObserverCount - 1);

  if (authCheckObserverCount > 0 || !sharedAuthCheckController) {
    return;
  }

  if (authCheckAbortTimer) {
    return;
  }

  authCheckAbortTimer = setTimeout(() => {
    authCheckAbortTimer = null;

    if (authCheckObserverCount > 0) {
      return;
    }

    cancelSharedAuthCheck();
  }, AUTH_CHECK_ABORT_GRACE_MS);
};

const getCachedAuthStatus = (): boolean | null => {
  if (!authStatusCache) {
    return null;
  }

  const isFresh = Date.now() - authStatusCache.cachedAt <= AUTH_STATUS_CACHE_TTL_MS;
  if (!isFresh) {
    return null;
  }

  return authStatusCache.isAuthenticated;
};

const runAuthCheck = async (signal: AbortSignal): Promise<boolean> => {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    return false;
  }

  let response = await fetchSummary(signal);

  if (response.status === 401 || response.status === 403) {
    const didRefresh = await refreshAuthSession();
    if (didRefresh) {
      response = await fetchSummary(signal);
    } else {
      await logoutAuthSession();
      return false;
    }
  }

  return response.ok;
};

const getSharedAuthCheck = (force: boolean): Promise<boolean> => {
  if (force) {
    authStatusCache = null;
    cancelSharedAuthCheck();
  }

  const cached = getCachedAuthStatus();
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  if (sharedAuthCheckPromise) {
    return sharedAuthCheckPromise;
  }

  const controller = new AbortController();
  sharedAuthCheckController = controller;

  sharedAuthCheckPromise = (async (): Promise<boolean> => {
    try {
      const isAuthenticated = await runAuthCheck(controller.signal);
      authStatusCache = {
        isAuthenticated,
        cachedAt: Date.now(),
      };
      return isAuthenticated;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      authStatusCache = {
        isAuthenticated: false,
        cachedAt: Date.now(),
      };

      return false;
    } finally {
      if (sharedAuthCheckController === controller) {
        sharedAuthCheckController = null;
      }

      sharedAuthCheckPromise = null;
    }
  })();

  return sharedAuthCheckPromise;
};

const useAuthStatus = () => {
  const initialCached = getCachedAuthStatus();
  const [isAuthenticated, setIsAuthenticated] = useState(initialCached ?? false);
  const [isLoading, setIsLoading] = useState(initialCached === null);

  useEffect(() => {
    let isMounted = true;
    let requestSequence = 0;

    trackAuthCheckObserver();

    const checkAuth = async (force: boolean) => {
      requestSequence += 1;
      const currentSequence = requestSequence;

      setIsLoading(true);

      try {
        const nextStatus = await getSharedAuthCheck(force);
        if (!isMounted || currentSequence !== requestSequence) {
          return;
        }

        setIsAuthenticated(nextStatus);
      } catch (error) {
        if (!isAbortError(error) && isMounted && currentSequence === requestSequence) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted && currentSequence === requestSequence) {
          setIsLoading(false);
        }
      }
    };

    const handleAuthStateChanged = () => {
      void checkAuth(true);
    };

    void checkAuth(false);

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    }

    return () => {
      isMounted = false;
      requestSequence += 1;
      untrackAuthCheckObserver();

      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
      }
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
  };
};

export { useAuthStatus };
