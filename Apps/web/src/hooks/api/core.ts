import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiError, ApiResponse } from '../../lib/api';

const COPY = {
  genericError: 'Unable to complete this request right now.',
} as const;

const QUERY_ABORT_GRACE_MS = 200;

export interface UiError {
  message: string;
  status?: number;
  isAuthError?: boolean;
}

interface QueryCacheEntry<TData> {
  data: TData;
  headers: Headers;
  cachedAt: number;
}

interface InflightQueryEntry<TData> {
  controller: AbortController;
  promise: Promise<ApiResponse<TData>>;
}

interface UseApiQueryOptions<TData> {
  queryKey: string;
  enabled?: boolean;
  staleTime?: number;
  queryFn: (signal: AbortSignal) => Promise<ApiResponse<TData>>;
}

export interface UseApiQueryResult<TData> {
  data: TData | null;
  error: UiError | null;
  isLoading: boolean;
  isFetching: boolean;
  headers: Headers | null;
  refetch: () => Promise<void>;
}

export interface UseApiMutationResult<TData, TVariables> {
  data: TData | null;
  error: UiError | null;
  isPending: boolean;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

const queryCache = new Map<string, QueryCacheEntry<unknown>>();
const inflightQueryMap = new Map<string, InflightQueryEntry<unknown>>();
const queryObserverCountMap = new Map<string, number>();
const queryAbortTimerMap = new Map<string, ReturnType<typeof setTimeout>>();

const isAbortError = (requestError: unknown): boolean => {
  return typeof DOMException !== 'undefined'
    && requestError instanceof DOMException
    && requestError.name === 'AbortError';
};

const isAuthErrorStatus = (status?: number): boolean => status === 401 || status === 403;

const clearQueryAbortTimer = (queryKey: string): void => {
  const timer = queryAbortTimerMap.get(queryKey);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  queryAbortTimerMap.delete(queryKey);
};

const getQueryObserverCount = (queryKey: string): number => {
  return queryObserverCountMap.get(queryKey) ?? 0;
};

const scheduleAbortInflightQuery = (queryKey: string): void => {
  if (queryAbortTimerMap.has(queryKey)) {
    return;
  }

  const timer = setTimeout(() => {
    queryAbortTimerMap.delete(queryKey);

    if (getQueryObserverCount(queryKey) > 0) {
      return;
    }

    const inflightEntry = inflightQueryMap.get(queryKey);
    if (!inflightEntry) {
      return;
    }

    inflightEntry.controller.abort();
    inflightQueryMap.delete(queryKey);
  }, QUERY_ABORT_GRACE_MS);

  queryAbortTimerMap.set(queryKey, timer);
};

const trackQueryObserver = (queryKey: string): void => {
  clearQueryAbortTimer(queryKey);

  const currentCount = getQueryObserverCount(queryKey);
  queryObserverCountMap.set(queryKey, currentCount + 1);
};

const untrackQueryObserver = (queryKey: string): void => {
  const currentCount = getQueryObserverCount(queryKey);

  if (currentCount <= 1) {
    queryObserverCountMap.delete(queryKey);

    if (inflightQueryMap.has(queryKey)) {
      scheduleAbortInflightQuery(queryKey);
    }

    return;
  }

  queryObserverCountMap.set(queryKey, currentCount - 1);
};

const cancelInflightQuery = (queryKey: string): void => {
  clearQueryAbortTimer(queryKey);

  const inflightEntry = inflightQueryMap.get(queryKey);
  if (!inflightEntry) {
    return;
  }

  inflightEntry.controller.abort();
  inflightQueryMap.delete(queryKey);
};

const getOrCreateInflightQuery = <TData>(
  queryKey: string,
  queryFn: (signal: AbortSignal) => Promise<ApiResponse<TData>>
): Promise<ApiResponse<TData>> => {
  const existingEntry = inflightQueryMap.get(queryKey) as InflightQueryEntry<TData> | undefined;
  if (existingEntry) {
    return existingEntry.promise;
  }

  const controller = new AbortController();

  const promise = queryFn(controller.signal)
    .finally(() => {
      const activeEntry = inflightQueryMap.get(queryKey);
      if (activeEntry?.controller === controller) {
        inflightQueryMap.delete(queryKey);
      }

      if (getQueryObserverCount(queryKey) === 0) {
        clearQueryAbortTimer(queryKey);
      }
    });

  inflightQueryMap.set(queryKey, {
    controller,
    promise,
  });

  return promise;
};

export const toUiError = (error: unknown): UiError => {
  const typedError = error as ApiError;
  const status = typeof typedError?.status === 'number' ? typedError.status : undefined;

  if (typeof typedError?.message === 'string' && typedError.message.trim()) {
    return {
      message: typedError.message,
      status,
      isAuthError: isAuthErrorStatus(status),
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      message: error.message,
      status,
      isAuthError: isAuthErrorStatus(status),
    };
  }

  return {
    message: COPY.genericError,
    status,
    isAuthError: isAuthErrorStatus(status),
  };
};

const getCachedResult = <TData>(queryKey: string, staleTime: number): QueryCacheEntry<TData> | null => {
  const cached = queryCache.get(queryKey) as QueryCacheEntry<TData> | undefined;

  if (!cached) {
    return null;
  }

  if (staleTime <= 0) {
    return null;
  }

  const isFresh = Date.now() - cached.cachedAt <= staleTime;
  return isFresh ? cached : null;
};

export const invalidateQuery = (queryKeyPrefix: string): void => {
  Array.from(queryCache.keys())
    .filter((key) => key.startsWith(queryKeyPrefix))
    .forEach((key) => {
      queryCache.delete(key);
    });
};

export const useApiQuery = <TData>(options: UseApiQueryOptions<TData>): UseApiQueryResult<TData> => {
  const { queryKey, queryFn } = options;
  const enabled = options.enabled ?? true;
  const staleTime = options.staleTime ?? 0;

  const initialCached = useMemo(() => getCachedResult<TData>(queryKey, staleTime), [queryKey, staleTime]);

  const [data, setData] = useState<TData | null>(initialCached?.data ?? null);
  const [headers, setHeaders] = useState<Headers | null>(initialCached?.headers ?? null);
  const [error, setError] = useState<UiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !initialCached);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const hasDataRef = useRef<boolean>(Boolean(initialCached));
  const queryFnRef = useRef(queryFn);
  const requestSequenceRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const runQuery = useCallback(
    async (force: boolean): Promise<void> => {
      if (!enabled) {
        return;
      }

      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;

      const isRequestStale = (): boolean => {
        return !isActiveRef.current || requestSequence !== requestSequenceRef.current;
      };

      const cached = force ? null : getCachedResult<TData>(queryKey, staleTime);
      if (cached) {
        if (isRequestStale()) {
          return;
        }

        setData(cached.data);
        setHeaders(cached.headers);
        setError(null);
        hasDataRef.current = true;
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      if (force) {
        cancelInflightQuery(queryKey);
      }

      setIsFetching(true);
      setIsLoading((current) => (hasDataRef.current ? current : true));

      try {
        const response = await getOrCreateInflightQuery<TData>(queryKey, queryFnRef.current);

        if (isRequestStale()) {
          return;
        }

        queryCache.set(queryKey, {
          data: response.data,
          headers: response.headers,
          cachedAt: Date.now(),
        });

        setData(response.data);
        setHeaders(response.headers);
        setError(null);
        hasDataRef.current = true;
      } catch (requestError) {
        if (isAbortError(requestError) || isRequestStale()) {
          return;
        }

        setError(toUiError(requestError));
      } finally {
        if (isRequestStale()) {
          return;
        }

        setIsFetching(false);
        setIsLoading(false);
      }
    },
    [enabled, queryKey, staleTime]
  );

  useEffect(() => {
    isActiveRef.current = true;

    if (!enabled) {
      requestSequenceRef.current += 1;
      hasDataRef.current = false;
      setData(null);
      setHeaders(null);
      setError(null);
      setIsLoading(false);
      setIsFetching(false);

      return () => {
        isActiveRef.current = false;
      };
    }

    trackQueryObserver(queryKey);

    const cleanup = () => {
      isActiveRef.current = false;
      requestSequenceRef.current += 1;
      untrackQueryObserver(queryKey);
    };

    const cached = getCachedResult<TData>(queryKey, staleTime);
    if (cached) {
      hasDataRef.current = true;
      setData(cached.data);
      setHeaders(cached.headers);
      setError(null);
      setIsLoading(false);
      setIsFetching(false);

      return cleanup;
    }

    requestSequenceRef.current += 1;
    hasDataRef.current = false;
    setData(null);
    setHeaders(null);
    setError(null);
    setIsLoading(true);

    void runQuery(false);

    return cleanup;
  }, [enabled, queryKey, runQuery, staleTime]);

  const refetch = useCallback(async () => {
    invalidateQuery(queryKey);
    await runQuery(true);
  }, [queryKey, runQuery]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    headers,
    refetch,
  };
};

export const useApiMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
): UseApiMutationResult<TData, TVariables> => {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsPending(true);
      setError(null);

      try {
        const response = await mutationFn(variables);
        setData(response);
        return response;
      } catch (requestError) {
        const normalizedError = toUiError(requestError);
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsPending(false);
  }, []);

  return {
    data,
    error,
    isPending,
    mutateAsync,
    reset,
  };
};
