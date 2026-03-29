import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../utils/api';
import { clearCsrfToken, getCsrfHeader, getCsrfToken, setCsrfToken } from '../utils/csrf';
import { AUTH_STATE_CHANGED_EVENT } from '../utils/authEvents';

interface RefreshResponse {
  csrf_token?: string;
}

// Global refresh promise to prevent concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

const useAuthStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async (): Promise<Response> => fetch(`${apiBaseUrl}/api/v1/users/me/summary`, {
      method: 'GET',
      headers: {
        'X-Client-Type': 'web',
      },
      credentials: 'include',
    });

    const refreshSession = async (): Promise<boolean> => {
      // If a refresh is already in progress, wait for it
      if (refreshPromise) {
        return refreshPromise;
      }

      // Create new refresh promise
      refreshPromise = (async (): Promise<boolean> => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Type': 'web',
              ...getCsrfHeader(),
            },
            credentials: 'include',
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            clearCsrfToken();
            return false;
          }

          try {
            const refreshBody = (await response.json()) as RefreshResponse;
            setCsrfToken(refreshBody.csrf_token ?? null);
          } catch {
            setCsrfToken(null);
          }

          return true;
        } finally {
          // Clear the global promise after a short delay to allow
          // the new cookies to be set and subsequent requests to use them
          setTimeout(() => {
            refreshPromise = null;
          }, 100);
        }
      })();

      return refreshPromise;
    };

    const checkAuth = async () => {
      try {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
          if (!cancelled) {
            setIsAuthenticated(false);
          }
          return;
        }

        let response = await fetchSummary();

        if (response.status === 401) {
          const didRefresh = await refreshSession();
          if (didRefresh) {
            response = await fetchSummary();
          }
        }

        if (!cancelled) {
          setIsAuthenticated(response.ok);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const handleAuthStateChanged = () => {
      void checkAuth();
    };

    void checkAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    }

    return () => {
      cancelled = true;

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
