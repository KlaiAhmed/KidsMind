import { useEffect } from 'react';

import type { AuthTokenResponse } from '@/auth/types';
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '@/auth/tokenStorage';
import { refreshToken } from '@/services/authApi';

interface UseSilentRefreshOptions {
  setLoading: (isLoading: boolean) => void;
  setAuthenticated: (payload: AuthTokenResponse) => void;
  setUnauthenticated: () => void;
}

export function useSilentRefresh({
  setLoading,
  setAuthenticated,
  setUnauthenticated,
}: UseSilentRefreshOptions): void {
  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      setLoading(true);

      try {
        const storedRefreshToken = await getRefreshToken();

        if (!storedRefreshToken) {
          if (isMounted) {
            setUnauthenticated();
          }
          return;
        }

        const refreshed = await refreshToken({ refreshToken: storedRefreshToken });
        await saveRefreshToken(refreshed.refresh_token);

        if (isMounted) {
          setAuthenticated(refreshed);
        }
      } catch {
        await clearRefreshToken();

        if (isMounted) {
          setUnauthenticated();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [setAuthenticated, setLoading, setUnauthenticated]);
}